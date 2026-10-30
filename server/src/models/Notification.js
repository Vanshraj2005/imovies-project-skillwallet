/**
 * Notification Mongoose Model
 * Manages user alert messages for booking updates, schedule changes, and reminders.
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient user reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: [
        'BOOKING_CONFIRMED',
        'BOOKING_CANCELLED',
        'SHOW_REMINDER',
        'PAYMENT_SUCCESS',
        'FOOD_ORDER_PREPARING',
        'FOOD_ORDER_READY',
        'FOOD_ORDER_COLLECTED',
        'GROUP_PLAN_INVITE',
        'GROUP_PLAN_VOTE',
        'GROUP_PLAN_DECIDED',
        'GROUP_PLAN_BOOKED',
        'SYSTEM_ALERT',
      ],
      default: 'BOOKING_CONFIRMED',
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message body is required'],
      trim: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    show: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Show',
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

