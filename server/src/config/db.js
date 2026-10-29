/**
 * Database Connection Manager (Mongoose / MongoDB)
 * Manages connection lifecycle, event listeners, and graceful shutdown.
 */
const mongoose = require('mongoose');
const config = require('./env');
const { logger } = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    logger.info('Using existing MongoDB connection');
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    isConnected = conn.connection.readyState === 1;

    logger.info(`MongoDB Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB runtime connection error', { error: err.message });
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost. Attempting reconnect...');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
      isConnected = true;
    });

    return conn.connection;
  } catch (error) {
    logger.error('Failed to establish MongoDB connection', {
      error: error.message,
      uri: config.mongodb.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'), // Mask credentials
    });
    // In development mode, don't crash the server so health check / UI can still run
    if (config.isProduction) {
      process.exit(1);
    }
    return null;
  }
};

const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose.connection.readyState;
  return {
    state: states[readyState] || 'unknown',
    isConnected: readyState === 1,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
    logger.info('MongoDB connection closed cleanly');
  }
};

module.exports = {
  connectDB,
  getDBStatus,
  disconnectDB,
};
