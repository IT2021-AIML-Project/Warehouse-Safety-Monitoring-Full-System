require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const authRoutes = require('./routes/authRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const ppeItemRoutes = require('./routes/ppeItemRoutes');
const zoneAssignmentRoutes = require('./routes/zoneAssignmentRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const inferenceRoutes = require('./routes/inferenceRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_URI;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/ppe-items', ppeItemRoutes);
app.use('/api/zone-assignments', zoneAssignmentRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/inferences', inferenceRoutes);

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'SafetyFirst API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
