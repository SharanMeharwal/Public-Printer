import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import PrintJob from './models/PrintJob.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const printerIO = io.of('/connectprinter');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// DB Connection
const MONGODB_URI = process.env.DB_URL;
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret'
});

// Upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});


app.get('/', (req, res) => {
  res.render('index');
});

// Step 1: upload the pdf and count pages
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const { printerName } = req.body;
    
    if (!printerName) {
      return res.status(400).json({ error: 'Printer name is required' });
    }

    // Count PDF pages
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const pageCount = pdfData.numpages;

    console.log(`PDF uploaded: ${req.file.originalname}`);
    console.log(`Total pages: ${pageCount}`);

    res.json({
      success: true,
      message: 'PDF uploaded successfully',
      fileId: req.file.filename,
      originalName: req.file.originalname,
      pageCount: pageCount,
      printerName: printerName
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload PDF',
      details: error.message 
    });
  }
});

// Step 2: Create Razorpay order
app.post('/create-order', async (req, res) => {
  try {
    const { fileId, originalName, pageCount, printerName, copies } = req.body;

    if (!fileId || !pageCount || !printerName || !copies) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate amount: (pages * 2) * copies (in rupees, convert to paise)
    const amountInRupees = (pageCount * 2) * copies;
    const amountInPaise = amountInRupees * 100;

    // Create Razorpay order
    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        fileId: fileId,
        originalName: originalName,
        printerName: printerName,
        pageCount: pageCount.toString(),
        copies: copies.toString()
      }
    };

    const order = await razorpay.orders.create(options);

    // Create print job in database with payment pending
    const printJob = new PrintJob({
      filename: fileId,
      originalName: originalName,
      filePath: `uploads/${fileId}`,
      fileUrl: `/uploads/${fileId}`,
      printerName: printerName,
      pageCount: pageCount,
      copies: copies,
      amount: amountInRupees,
      razorpayOrderId: order.id,
      paymentStatus: 'pending',
      status: 'pending',
      uploadedAt: new Date()
    });

    await printJob.save();

    console.log(`Order created: ${order.id}`);
    console.log(`Amount: ₹${amountInRupees} (${pageCount} pages × ₹2 × ${copies} copies)`);

    res.json({
      success: true,
      orderId: order.id,
      amount: amountInRupees,
      currency: 'INR',
      jobId: printJob._id,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key'
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      details: error.message 
    });
  }
});

// Step 3: Verify payment and trigger print
app.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, jobId } = req.body;

    // Verify signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'dummy_secret')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment signature' 
      });
    }

    // Update print job with payment info
    const printJob = await PrintJob.findByIdAndUpdate(
      jobId,
      { 
        paymentId: razorpay_payment_id,
        paymentStatus: 'paid',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!printJob) {
      return res.status(404).json({ error: 'Print job not found' });
    }

    // emit message to socket to printer with copies
    printerIO.emit('new-print-job', {
      jobId: printJob._id,
      printerName: printJob.printerName,
      fileUrl: printJob.fileUrl,
      filename: printJob.originalName,
      filePath: path.join(__dirname, printJob.filePath),
      copies: printJob.copies,
      pageCount: printJob.pageCount
    });

    console.log(`✓ Payment verified for job ${printJob._id}`);
    console.log(`  Payment ID: ${razorpay_payment_id}`);
    console.log(`  Printer: ${printJob.printerName}`);
    console.log(`  Copies: ${printJob.copies}`);
    console.log(`  Print job sent to agent`);

    res.json({
      success: true,
      message: 'Payment verified and print job sent to printer',
      jobId: printJob._id,
      printer: printJob.printerName,
      filename: printJob.originalName,
      copies: printJob.copies
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      error: 'Failed to verify payment',
      details: error.message 
    });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await PrintJob.find().sort({ uploadedAt: -1 }).limit(50);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// update status
app.put('/api/jobs/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const job = await PrintJob.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job status' });
  }
});


// socket connection
printerIO.on('connection', (socket) => {
  console.log('✓ Printer agent connected:', socket.id);

  socket.on('printer-registered', (data) => {
    console.log(`✓ Printer registered: ${data.printerName}`);
  });

  socket.on('job-status-update', async (data) => {
    console.log(`Status update for job ${data.jobId}: ${data.status}`);
    try {
      await PrintJob.findByIdAndUpdate(data.jobId, { 
        status: data.status,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('✗ Printer agent disconnected:', socket.id);
  });
});



app.use('/uploads', express.static('uploads'));


// start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     Cloud Printer System Started       ║
╠════════════════════════════════════════╣
║  Server: http://localhost:${PORT}         ║
║  Status: Ready to accept print jobs    ║
╚════════════════════════════════════════╝
  `);
});
