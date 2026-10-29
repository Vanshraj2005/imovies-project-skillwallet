/**
 * HTTP Request Logging Middleware
 * Integrates morgan with our structured, sensitive-data-safe logger.
 */
const morgan = require('morgan');
const { logger } = require('../utils/logger');

// Custom morgan format omitting raw auth tokens and sensitive headers
const requestLogger = morgan(
  (tokens, req, res) => {
    const status = tokens.status(req, res);
    const method = tokens.method(req, res);
    const url = tokens.url(req, res);
    const responseTime = `${tokens['response-time'](req, res)} ms`;
    const contentLength = tokens.res(req, res, 'content-length') || '0';
    const remoteAddr = tokens['remote-addr'](req, res);

    return JSON.stringify({
      method,
      url,
      status: Number(status),
      responseTime,
      contentLength,
      remoteAddr,
    });
  },
  {
    stream: {
      write: (message) => {
        try {
          const parsed = JSON.parse(message.trim());
          if (parsed.status >= 500) {
            logger.error(`HTTP ${parsed.method} ${parsed.url}`, parsed);
          } else if (parsed.status >= 400) {
            logger.warn(`HTTP ${parsed.method} ${parsed.url}`, parsed);
          } else {
            logger.info(`HTTP ${parsed.method} ${parsed.url}`, parsed);
          }
        } catch {
          logger.info(message.trim());
        }
      },
    },
    skip: (req) => {
      // Don't clutter logs with high-frequency health pings in test or production
      return req.path === '/api/health' && process.env.NODE_ENV === 'test';
    },
  }
);

module.exports = requestLogger;
