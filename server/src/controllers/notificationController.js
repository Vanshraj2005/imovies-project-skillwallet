/**
 * Notification Controller
 * Manages user alert messages for booking updates, schedule changes, and reminders.
 */
const Notification = require('../models/Notification');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// Default initial notifications fallback
const defaultNotifications = [
  {
    _id: 'notif_1',
    id: 'notif_1',
    type: 'SYSTEM_ALERT',
    title: 'Welcome to IMovies!',
    message: 'Explore current cinema showtimes and select your preferred seats with instant digital e-tickets.',
    isRead: false,
    createdAt: new Date(),
  },
];

let inMemoryNotifications = [...defaultNotifications];

/**
 * Get User Notifications
 * GET /api/v1/notifications
 */
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isDBConnected = Notification.db?.readyState === 1;

    let notifications = [];
    if (isDBConnected) {
      notifications = await Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(30);
    } else {
      notifications = inMemoryNotifications;
    }

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return sendSuccess(res, 'Notifications retrieved', notifications, 200, {
      unreadCount,
    });
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Mark Single Notification as Read
 * PATCH /api/v1/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const isDBConnected = Notification.db?.readyState === 1;

    if (isDBConnected && id.match(/^[0-9a-fA-F]{24}$/)) {
      await Notification.findByIdAndUpdate(id, { isRead: true });
    } else {
      const notif = inMemoryNotifications.find((n) => n._id === id || n.id === id);
      if (notif) notif.isRead = true;
    }

    return sendSuccess(res, 'Notification marked as read');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

/**
 * Mark All Notifications as Read
 * PATCH /api/v1/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const isDBConnected = Notification.db?.readyState === 1;

    if (isDBConnected) {
      await Notification.updateMany({ recipient: userId }, { isRead: true });
    } else {
      inMemoryNotifications.forEach((n) => {
        n.isRead = true;
      });
    }

    return sendSuccess(res, 'All notifications marked as read');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  inMemoryNotifications,
};

