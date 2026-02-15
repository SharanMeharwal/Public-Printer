# Cloud Printer System

A cloud-based printing solution that allows users to upload PDF files through a web interface and print them on remote networked printers. The system consists of a Node.js backend server and Node.js-based printer agents that can run on any computer with a printer.

![Cloud Printer System](./public/image.png)

## 🚀 Features

- **Web-based PDF Upload**: Upload PDF files through a simple web interface
- **💳 Razorpay Payment Integration**: Pay-per-page printing with automatic price calculation
- **📄 PDF Page Counting**: Automatic page detection for accurate pricing
- **🔢 Multi-Copy Support**: Print multiple copies with a single payment
- **🎯 Multi-Step Workflow**: Easy 4-step process - Upload → Select Copies → Pay → Print
- **Real-time Communication**: Socket.IO-based real-time connection between server and printer agents
- **Multi-printer Support**: Connect multiple printer agents from different locations
- **Job Tracking**: MongoDB-based job tracking with status updates
- **Cross-platform Agent**: Node.js agent works on Windows, Linux, and macOS
- **Automatic Printing**: PDFs are automatically downloaded and printed on target printers

## 💰 Pricing

The system uses a simple pricing model:
- **₹2 per page**
- **Formula**: (Number of Pages × ₹2) × Number of Copies
- **Example**: 10 pages × ₹2 × 3 copies = ₹60

Payment is processed securely through Razorpay before printing begins.

## 📋 Prerequisites


### For Cloud Server
- Node.js 18.x or higher
- MongoDB (local or cloud instance like MongoDB Atlas)
- npm or yarn

### For Printer Agent
- Node.js 18.x or higher
- npm or yarn
- A printer installed and configured on the system
- Network access to the cloud server

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/SharanMeharwal/Public-Printer.git
cd cloudprinter

# Setup Cloud Server
cd cloud
npm install
copy .env.example .env
# Edit .env with your MongoDB URL
node index.js

# Setup Printer Agent (in another terminal)
cd agent
npm install
copy .env.example .env
# Edit .env with SERVER_URL and PRINTER_NAME
node printer_agent.js
```

Then open `http://localhost:3000` in your browser!

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/SharanMeharwal/Public-Printer.git
cd cloudprinter
```

### 2. Cloud Server Setup

#### Install Dependencies

Navigate to the cloud directory:

```bash
cd cloud
npm install
```

Required packages:
- express
- socket.io
- mongoose
- multer
- ejs
- dotenv
- pdf-parse (for page counting)
- razorpay (for payment processing)

#### Configure Environment Variables

Create a `.env` file in the `cloud` directory:

```bash
# On Windows
copy .env.example .env

# On Linux/Mac
cp .env.example .env
```

Edit the `.env` file:

```env
# MongoDB Connection String
DB_URL=mongodb://localhost:27017/cloudprinter
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/cloudprinter

# Server Port
PORT=3000

# Razorpay Credentials (Required for payment processing)
# Get your keys from https://dashboard.razorpay.com/app/keys
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

**Note**: To get Razorpay credentials:
1. Sign up at [Razorpay](https://razorpay.com/)
2. Go to Settings → API Keys
3. Generate Test/Live keys
4. Add them to your `.env` file

#### Start the Cloud Server

```bash
node index.js
```

Or use the VS Code task: Press `Ctrl+Shift+P` → `Tasks: Run Task` → `Run Cloud (Port 3000)`

The server will start at `http://localhost:3000`

### 3. Printer Agent Setup

#### Install Node.js Dependencies

Navigate to the agent directory:

```bash
cd agent
npm install
```

Required packages:
- socket.io-client
- axios
- dotenv
- pdf-to-printer

#### Configure Agent Environment Variables

Create a `.env` file in the `agent` directory:

```bash
# On Windows
copy .env.example .env

# On Linux/Mac
cp .env.example .env
```

Edit the `.env` file:

```env
# Cloud Server URL (update with your server's IP or domain)
SERVER_URL=http://localhost:3000

# Unique Printer Name (must match the actual printer name on the system)
PRINTER_NAME=HP-LaserJet-Pro

# Download Directory for PDFs
DOWNLOAD_DIR=./downloads
```

#### Start the Printer Agent

```bash
node printer_agent.js
```

Or use npm:
```bash
npm start
```

Or use the VS Code task: Press `Ctrl+Shift+P` → `Tasks: Run Task` → `Run Printer Agent`

## 📁 Project Structure

```
cloudprinter/
├── cloud/                      # Backend server
│   ├── index.js               # Main server file
│   ├── package.json           # Node.js dependencies
│   ├── .env                   # Environment variables (create this)
│   ├── models/
│   │   └── PrintJob.js        # MongoDB schema for print jobs
│   ├── views/
│   │   └── index.ejs          # Web interface
│   ├── uploads/               # Uploaded PDF files
│   └── public/                # Static files (CSS, JS)
│
├── agent/                     # Printer agent
│   ├── printer_agent.js       # Node.js agent script
│   ├── package.json           # Node.js dependencies
│   ├── .env                   # Agent configuration (create this)
│   └── downloads/             # Downloaded PDFs for printing
│
├── .vscode/
│   └── tasks.json             # VS Code tasks for running components
│
├── .env.example               # Example environment variables
└── README.md                  # This file
```

## 🎮 Usage

### Starting the Complete System

1. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

2. **Start the Cloud Server**:
   ```bash
   cd cloud
   node index.js
   ```

3. **Start the Printer Agent** (on the computer with the printer):
   ```bash
   cd agent
   node printer_agent.js
   ```

4. **Access the Web Interface**:
   Open your browser and go to `http://localhost:3000`

### Using VS Code Tasks

Press `Ctrl+Shift+P` → `Tasks: Run Task` and choose:
- **Run Cloud (Port 3000)** - Starts the backend server
- **Run Printer Agent** - Starts the printer agent
- **Run Both** - Starts both components in parallel

### Uploading and Printing a PDF

The system uses a 4-step payment workflow:

**Step 1: Upload Document**
1. Open the web interface at `http://localhost:3000`
2. Click or drag-and-drop to upload your PDF file
3. The system automatically counts the pages
4. Select your target printer from the dropdown
5. Click "Next: Select Copies"

**Step 2: Select Copies & View Pricing**
1. Use the +/- buttons to select number of copies (1-100)
2. View the pricing breakdown:
   - Number of pages detected
   - Price per page (₹2)
   - Number of copies selected
   - **Total amount** = (Pages × ₹2) × Copies
3. Click "Proceed to Payment"

**Step 3: Make Payment**
1. Review your order summary
2. Click "Pay Now" to open Razorpay payment gateway
3. Complete payment using:
   - Credit/Debit Card
   - UPI
   - Net Banking
   - Wallet
4. Payment is verified securely

**Step 4: Print Confirmation**
1. After successful payment, print job is automatically sent to the printer agent
2. View job details including Job ID, printer name, and copies
3. The agent prints the specified number of copies
4. Click "Print Another Document" to start over

**Test Payment:**
For testing, use Razorpay test credentials:
- Card: 4111 1111 1111 1111
- CVV: Any 3 digits
- Expiry: Any future date

## 🌐 Running on Different Networks

### Server on Public Network

1. Deploy the cloud server to a VPS or cloud platform (AWS, Azure, DigitalOcean, etc.)
2. Update the MongoDB connection string in `.env`
3. Note the public IP or domain name

### Connecting Remote Printers

1. On the printer agent computer, update `.env`:
   ```env
   SERVER_URL=http://your-server-ip:3000
   # Or use domain: https://yourdomain.com
   ```

2. Ensure firewall allows connections on port 3000
3. For production, use HTTPS and secure the server

## 🔒 Security Considerations

For production deployment:

1. **Use HTTPS**: Set up SSL/TLS certificates
2. **Secure MongoDB**: Use authentication and restrict network access
3. **Add Authentication**: Implement user authentication for the web interface
4. **Validate Uploads**: Add additional file validation and virus scanning
5. **Rate Limiting**: Implement rate limiting to prevent abuse
6. **Environment Variables**: Never commit `.env` files to version control
7. **Firewall Rules**: Restrict access to trusted IP addresses

## 📝 Environment Variables Reference

### Cloud Server (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_URL` | MongoDB connection string | `mongodb://localhost:27017/cloudprinter` |
| `PORT` | Server port | `3000` |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | `rzp_test_abc123...` |
| `RAZORPAY_KEY_SECRET` | Razorpay API Secret | `xyz789...` |

### Printer Agent (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `SERVER_URL` | Cloud server URL | `http://localhost:3000` |
| `PRINTER_NAME` | Exact printer name | `HP-LaserJet-Pro-M404dn` |
| `DOWNLOAD_DIR` | PDF download location | `./downloads` |

## 🐛 Troubleshooting

### Server won't start
- Check if MongoDB is running
- Verify `.env` file exists and has correct values
- Ensure port 3000 is not in use
- Check MongoDB connection string

### Agent won't connect
- Verify `SERVER_URL` is correct
- Check if server is running and accessible
- Look for firewall blocking the connection
- Ensure network connectivity

### PDF won't print
- Verify printer name matches exactly (case-sensitive)
- Check if printer is online and has paper
- Ensure printer drivers are installed
- Check the `downloads` folder for the PDF file
- Review agent logs for error messages

### Payment issues
- Verify Razorpay credentials in `.env` are correct
- Check if you're using test mode keys for testing
- Ensure internet connection is stable
- Check browser console for JavaScript errors
- Verify MongoDB is storing order details

### Page count not detected
- Ensure PDF is not corrupted
- Check if `pdf-parse` package is installed
- Try with a different PDF file
- Check server logs for parsing errors

### Upload fails
- Check file is a valid PDF
- Verify file size is under 10MB
- Ensure `uploads/` directory exists and is writable
- Check MongoDB connection

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**7anish**
- GitHub: [@7anish](https://github.com/7anish) , [Yamansaini0405](https://github.com/Yamansaini0405)

## 🙏 Acknowledgments

- Express.js for the web framework
- Socket.IO for real-time communication
- MongoDB for data persistence
- EJS for templating
- pdf-to-printer for cross-platform printing

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review troubleshooting section above

---

**Happy Printing! 🖨️**
