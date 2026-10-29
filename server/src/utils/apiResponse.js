/**
 * Standardized API Response Utilities
 * Ensures uniform JSON structure across all endpoints.
 */

const sendSuccess = (res, message = 'Success', data = null, statusCode = 200, meta = null) => {
  const payload = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, errors = null) => {
  const payload = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    payload.errors = Array.isArray(errors) ? errors : [errors];
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  sendSuccess,
  sendError,
};
