/**
 * Structured Logger with Sensitive Field Masking
 * Prevents accidental leakage of tokens, passwords, credit card info, and private keys.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordconfirmation',
  'newpassword',
  'oldpassword',
  'token',
  'refreshtoken',
  'accesstoken',
  'authorization',
  'secret',
  'jwt_secret',
  'keysecret',
  'cardnumber',
  'cvv',
  'expiry',
]);

const maskSensitiveData = (data, depth = 0) => {
  if (!data || depth > 5) return data;

  if (typeof data === 'string') {
    // Check for Bearer token patterns
    if (/Bearer\s+[A-Za-z0-9-_.]+/i.test(data)) {
      return data.replace(/Bearer\s+[A-Za-z0-9-_.]+/i, 'Bearer [MASKED]');
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
      if (SENSITIVE_KEYS.has(normalizedKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = maskSensitiveData(value, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
};

const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = maskSensitiveData(meta);
  const metaString =
    Object.keys(sanitizedMeta).length > 0
      ? ` | ${JSON.stringify(sanitizedMeta)}`
      : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
};

const logger = {
  info: (message, meta) => {
    // eslint-disable-next-line no-console
    console.log(formatLog('info', message, meta));
  },
  warn: (message, meta) => {
    // eslint-disable-next-line no-console
    console.warn(formatLog('warn', message, meta));
  },
  error: (message, meta) => {
    // eslint-disable-next-line no-console
    console.error(formatLog('error', message, meta));
  },
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug(formatLog('debug', message, meta));
    }
  },
};

module.exports = {
  logger,
  maskSensitiveData,
};
