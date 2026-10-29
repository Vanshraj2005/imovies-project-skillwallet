/**
 * Express Rate Limiting Middleware
 * Protects against brute-force attacks and denial-of-service abuse.
 */
const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const { sendError } = require('../utils/apiResponse');

// Standard API limiter for general endpoints
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMinutes * 60 * 1000,
  max: config.rateLimit.maxRequests,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    return sendError(
      res,
      'Too many requests from this IP address. Please try again later.',
      429,
      { retryAfterMinutes: config.rateLimit.windowMinutes }
    );
  },
  skip: (req) => {
    // Skip health check endpoint from rate limiting
    return req.path === '/api/health' || req.path === '/api/v1/health';
  },
});

// Stricter limiter for authentication endpoints (login, register, forgot-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(
      res,
      'Too many authentication attempts. For your security, this account action is temporarily locked. Please try again after 15 minutes.',
      429
    );
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
