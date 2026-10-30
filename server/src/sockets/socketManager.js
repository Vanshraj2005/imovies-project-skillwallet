/**
 * Socket.IO Real-time Communication Manager
 * Manages room subscriptions, seat hold notifications, releases, and bookings across clients.
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const corsOptions = require('../config/corsOptions');
const config = require('../config/env');
const { logger } = require('../utils/logger');

let io = null;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: corsOptions,
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Optional socket authentication middleware
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
        socket.handshake.query?.token;

      if (token) {
        try {
          const decoded = jwt.verify(token, config.jwt.secret);
          socket.user = decoded;
          logger.debug(`Socket ${socket.id} authenticated for user ${decoded.id || decoded._id}`);
        } catch (jwtErr) {
          logger.debug(`Socket ${socket.id} connected with unverified/expired token: ${jwtErr.message}`);
        }
      }
      return next();
    } catch (err) {
      return next();
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Real-time client connected: ${socket.id}`);

    // Automatically join user room if authenticated
    if (socket.user) {
      const uId = socket.user.id || socket.user._id;
      socket.join(`user_${uId}`);
      logger.debug(`Socket ${socket.id} joined personal notification room: user_${uId}`);
    }

    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        logger.debug(`Socket ${socket.id} joined personal room: user_${userId}`);
      }
    });

    // Join showtime-specific room for seat updates
    socket.on('join_show', (showId) => {
      if (showId) {
        const roomName = `show_${showId}`;
        socket.join(roomName);
        logger.debug(`Socket ${socket.id} joined show room: ${roomName}`);
        socket.emit('joined_show', { showId, room: roomName });
      }
    });

    // Leave showtime room
    socket.on('leave_show', (showId) => {
      if (showId) {
        const roomName = `show_${showId}`;
        socket.leave(roomName);
        logger.debug(`Socket ${socket.id} left show room: ${roomName}`);
        socket.emit('left_show', { showId, room: roomName });
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

/**
 * Targeted Seat Event Broadcasters
 */
const broadcastSeatHeld = (showId, data) => {
  if (io && showId) {
    io.to(`show_${showId}`).emit('seat_held', {
      showId,
      seatNumbers: data.seatNumbers || [],
      expiresAt: data.expiresAt,
      holdId: data.holdId,
      userId: data.userId,
      timestamp: new Date().toISOString(),
    });
    // Also emit backward-compatible generic event
    io.to(`show_${showId}`).emit('seat_status_changed', {
      type: 'HELD',
      seatNumbers: data.seatNumbers || [],
      expiresAt: data.expiresAt,
    });
  }
};

const broadcastSeatReleased = (showId, data) => {
  if (io && showId) {
    io.to(`show_${showId}`).emit('seat_released', {
      showId,
      seatNumbers: data.seatNumbers || [],
      timestamp: new Date().toISOString(),
    });
    io.to(`show_${showId}`).emit('seat_status_changed', {
      type: 'RELEASED',
      seatNumbers: data.seatNumbers || [],
    });
  }
};

const broadcastSeatBooked = (showId, data) => {
  if (io && showId) {
    io.to(`show_${showId}`).emit('seat_booked', {
      showId,
      seatNumbers: data.seatNumbers || [],
      bookingReference: data.bookingReference,
      timestamp: new Date().toISOString(),
    });
    io.to(`show_${showId}`).emit('seat_status_changed', {
      type: 'BOOKED',
      seatNumbers: data.seatNumbers || [],
    });
  }
};

// Legacy helper to broadcast seat status change to show room
const broadcastSeatUpdate = (showId, seatData) => {
  if (io && showId) {
    io.to(`show_${showId}`).emit('seat_status_changed', seatData);
  }
};

// Broadcast user-specific real-time alert (e.g. food ready, group invites)
const broadcastUserNotification = (userId, notificationData) => {
  if (io && userId) {
    io.to(`user_${userId}`).emit('notification', notificationData);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  broadcastSeatHeld,
  broadcastSeatReleased,
  broadcastSeatBooked,
  broadcastSeatUpdate,
  broadcastUserNotification,
};
