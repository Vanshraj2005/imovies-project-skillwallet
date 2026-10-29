/**
 * Environment Configuration and Startup Validator
 * Loads and validates critical application configuration settings.
 */
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from server/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Critical environment variable specifications
const requiredKeys = isProduction
  ? ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL']
  : [];

const missingKeys = requiredKeys.filter((key) => !process.env[key]);
if (missingKeys.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `[FATAL] Missing mandatory environment variables in ${NODE_ENV} mode: ${missingKeys.join(', ')}`
  );
  if (isProduction) {
    process.exit(1);
  }
}

const config = Object.freeze({
  env: NODE_ENV,
  isProduction,
  isDevelopment: NODE_ENV === 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/imovies_db',
    options: {
      autoIndex: !isProduction,
      serverSelectionTimeoutMS: 5000,
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'imovies_dev_default_jwt_secret_do_not_use_in_prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET || 'imovies_dev_default_refresh_secret_do_not_use_in_prod',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'dev_mock',
    keyId: process.env.PAYMENT_KEY_ID || 'mock_key_id',
    keySecret: process.env.PAYMENT_KEY_SECRET || 'mock_key_secret',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),
  },
  rateLimit: {
    windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MIN || '15', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300', 10),
  },
});

module.exports = config;
