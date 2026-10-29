/**
 * Express Application Configuration
 * Assembles middleware, security headers, rate limiting, logging, and routing.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const corsOptions = require('./config/corsOptions');
const requestLogger = require('./middleware/requestLogger');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');
const apiRouter = require('./routes/apiRouter');
const healthRoutes = require('./routes/healthRoutes');

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows cross-origin asset loading for movie posters in dev
    crossOriginEmbedderPolicy: false,
  })
);

// Cross-Origin Resource Sharing
app.use(cors(corsOptions));

// HTTP Request body parsing with safe limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Structured request logging
app.use(requestLogger);

// Rate limiting on API routes
app.use('/api', apiLimiter);

// Root health check endpoints for load balancers & monitoring
app.use('/api/health', healthRoutes);
app.use('/api/v1/health', healthRoutes);

// API Routes (supports both /api/v1 and /api)
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);

// 404 Handler for unmatched routes
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

module.exports = app;
