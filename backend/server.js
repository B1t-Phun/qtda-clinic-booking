const express = require('express');
const cors = require('cors');
require('./config/env');

const adminRoutes = require('./routes/adminRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const patientRoutes = require('./routes/patientRoutes');

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [...new Set([process.env.APP_URL || 'http://localhost:3000', 'http://127.0.0.1:3000', ...(process.env.AUTH_ADDITIONAL_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean)])],
  credentials: true,
}));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    project: process.env.PROJECT_NAME || 'ClinicCare',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/patient', patientRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy endpoint API: ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Lỗi server:', err);
  res.status(err.status || 500).json({
    success: false,
    message: 'Yêu cầu không thể xử lý.',
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 ClinicCare Backend Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`🏥 Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`🔗 Admin Endpoints:   http://localhost:${PORT}/api/admin/...`);
  console.log(`👨‍⚕️ Doctor Endpoints:  http://localhost:${PORT}/api/doctor/...`);
  console.log(`🏥 Patient Endpoints: http://localhost:${PORT}/api/patient/...`);
  console.log(`====================================================`);
});
