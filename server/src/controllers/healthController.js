/**
 * Health Check Controller
 * Reports system vitals, environment info, memory stats, and database connectivity.
 */
const { getDBStatus } = require('../config/db');
const { sendSuccess } = require('../utils/apiResponse');
const config = require('../config/env');

const getHealth = (req, res) => {
  const dbStatus = getDBStatus();
  const uptimeSeconds = Math.floor(process.uptime());

  const healthData = {
    service: 'IMovies REST API',
    status: 'healthy',
    version: '1.0.0',
    environment: config.env,
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptimeSeconds,
      formatted: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
    },
    database: dbStatus,
    runtime: {
      node: process.version,
      platform: process.platform,
      memoryMb: {
        rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
        heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2),
      },
    },
  };

  return sendSuccess(res, 'IMovies API is online and operational', healthData);
};

module.exports = {
  getHealth,
};
