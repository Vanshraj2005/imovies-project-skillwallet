/**
 * IMovies Server Entry Point
 * Initializes HTTP server, database connection, real-time sockets, and process handlers.
 */
const http = require('http');
const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { initializeSocket } = require('./sockets/socketManager');
const { logger } = require('./utils/logger');

const server = http.createServer(app);

// Attach Socket.IO
const io = initializeSocket(server);

// Start server
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  server.listen(config.port, () => {
    logger.info(`====================================================`);
    logger.info(`🎬 IMovies Server running in [${config.env}] mode`);
    logger.info(`🚀 API Endpoint: http://localhost:${config.port}/api/v1`);
    logger.info(`🩺 Health Check: http://localhost:${config.port}/api/health`);
    logger.info(`🌐 Allowed Client URL: ${config.clientUrl}`);
    logger.info(`====================================================`);
  });
};

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.warn(`Received ${signal}. Starting graceful shutdown...`);

  // Close HTTP server
  server.close(async () => {
    logger.info('HTTP server closed');

    // Close Socket.io
    if (io) {
      await io.close();
      logger.info('Socket.IO connections closed');
    }

    // Close Database
    await disconnectDB();

    logger.info('Graceful shutdown completed successfully');
    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded. Forcing termination.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection detected', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown', {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown('uncaughtException');
});

// Start application if executed directly
if (require.main === module) {
  startServer();
}

module.exports = { app, server, startServer };
