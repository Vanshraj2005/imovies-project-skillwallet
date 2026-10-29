/**
 * CORS Configuration
 * Restricts cross-origin requests to configured client domains.
 */
const config = require('./env');

const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
].filter(Boolean);

// In production, strictly enforce the configured clientUrl or comma-separated allowed list
const productionAllowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, server-to-server curl, health checks)
    if (!origin) {
      return callback(null, true);
    }

    const currentList = config.isProduction
      ? productionAllowedOrigins
      : allowedOrigins;

    if (currentList.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy does not allow access from origin: ${origin}`), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'x-client-version',
  ],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  maxAge: 86400, // 24 hours preflight cache
};

module.exports = corsOptions;
