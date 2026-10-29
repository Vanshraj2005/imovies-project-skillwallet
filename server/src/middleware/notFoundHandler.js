/**
 * Not-Found (404) Route Middleware
 * Catches all unmatched routes and returns a structured JSON error.
 */
const { sendError } = require('../utils/apiResponse');

const notFoundHandler = (req, res) => {
  return sendError(
    res,
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
    {
      suggestedEndpoints: [
        'GET /api/health',
        'GET /api/v1/health',
        'GET /api/v1/movies',
      ],
    }
  );
};

module.exports = notFoundHandler;
