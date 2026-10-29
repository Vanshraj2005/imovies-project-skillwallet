/**
 * Socket.IO Real-time Communication Manager
 * Prepares real-time foundation for seat hold locks, live occupancy, and booking updates.
 */
const { Server } = require('socket.io');
const corsOptions = require('../config/corsOptions');
const { logger } = require('../utils/logger');

let io = null;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: corsOptions,
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    logger.info(`Real-time client connected: ${socket.id}`);

    // Join showtime-specific room for seat updates
    socket.on('join_show', (showId) => {
      if (showId) {
        socket.join(`show_${showId}`);
        logger.debug(`Socket ${socket.id} joined show room: show_${showId}`);
      }
    });

    // Leave showtime room
    socket.on('leave_show', (showId) => {
      if (showId) {
        socket.leave(`show_${showId}`);
        logger.debug(`Socket ${socket.id} left show room: show_${showId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Real-time client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

// Helper to broadcast seat status change to show room
const broadcastSeatUpdate = (showId, seatData) => {
  if (io && showId) {
    io.to(`show_${showId}`).emit('seat_status_changed', seatData);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  broadcastSeatUpdate,
};
