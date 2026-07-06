const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Import Controllers
const emailController = require('./controllers/emailController');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Disable caching during development
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ===================== EMAIL ROUTES =====================
app.post('/api/send-document', emailController.sendDocument);           // ← Main route used by RFQ page
app.post('/api/documents/send-test', emailController.sendDocument);     // ← Your existing test route
app.post('/api/documents/:documentId/send', emailController.sendDocument);

// ===================== OTHER ROUTES =====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/products', require('./routes/products'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/recurring', require('./routes/recurring'));

// Root Route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📧 Email endpoint ready: /api/send-document`);
});
