/**
 * Core Database Models Barrel Exporter
 */
const User = require('./User');
const Movie = require('./Movie');
const Theatre = require('./Theatre');
const Show = require('./Show');
const Seat = require('./Seat');
const SeatLock = require('./SeatLock');
const Booking = require('./Booking');
const Payment = require('./Payment');
const Notification = require('./Notification');

module.exports = {
  User,
  Movie,
  Theatre,
  Show,
  Seat,
  SeatLock,
  Booking,
  Payment,
  Notification,
};

