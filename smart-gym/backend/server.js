// ============================================================
// server.js - Main Express Application
// Smart Gym Management System Backend
// ============================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

// ---- Middleware ----
app.use(cors({
  origin: ["https://smart-gym-frontend.onrender.com"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '10mb' }));        // parse JSON body
app.use(express.urlencoded({ extended: true }));  // parse URL-encoded body

// Serve static frontend files from /frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// ---- API Routes ----
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/members',    require('./routes/members'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/payments',   require('./routes/payments'));
app.use('/api/workouts',   require('./routes/workouts'));
app.use('/api/progress',   require('./routes/progress'));
app.use('/api/dashboard',  require('./routes/dashboard'));

// ---- Health Check ----
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Smart Gym API is running!', timestamp: new Date() });
});

// ---- Serve Frontend (SPA catch-all) ----
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ---- Global Error Handler ----
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ---- Start Server ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════╗');
    console.log('║   🏋️  Smart Gym Management System     ║');
    console.log(`║   Server running on port ${PORT}          ║`);
    console.log('║   http://localhost:' + PORT + '              ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('');
});

module.exports = app;
