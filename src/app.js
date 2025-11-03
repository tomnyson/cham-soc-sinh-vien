const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../config/app.config');

// Middleware
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

// Routes
const apiRoutes = require('./routes/api.routes');

// Initialize app
const app = express();

// CORS
app.use(cors(config.cors));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', apiRoutes);

// Serve index.html cho root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

module.exports = app;
