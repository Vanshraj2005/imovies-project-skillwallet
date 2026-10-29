/**
 * Centralized Application Error Handling Middleware
 * Standardizes all error responses and suppresses internal stack traces in production.
 */
const config = require('../config/env');
const { logger } = require('../utils/logger');
const { sendError } = require('../utils/apiResponse');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Log error with request context (sanitized)
  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${message}`, {
    statusCode,
    name: err.name,
    stack: config.isProduction ? undefined : err.stack,
  });

  // Handle Mongoose / MongoDB specific errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'resource';
    message = `Duplicate value entered for ${duplicatedField}. Must be unique.`;
    errors = [{ field: duplicatedField, message }];
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid identifier format: ${err.value}`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token. Please sign in again.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please refresh your session.';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON payload in request body.';
  }

  // Payload construction
  const errorDetails = config.isProduction ? errors : errors || (err.stack ? { stack: err.stack } : null);

  return sendError(res, message, statusCode, errorDetails);
};

module.exports = errorHandler;
