/**
 * Explicit Database Seeder Script
 * Populates MongoDB with baseline cinema data, admin/user accounts, screens, and shows.
 *
 * Usage:
 *   node src/scripts/seed.js
 *   node src/scripts/seed.js --force
 */
const mongoose = require('mongoose');
const config = require('../config/env');
const {
  User,
  Movie,
  Theatre,
  Show,
  Seat,
  SeatLock,
  Booking,
  Notification,
} = require('../models');
const initialMovies = require('../data/initialMovies');
const { logger } = require('../utils/logger');

const seedDatabase = async () => {
  const isForce = process.argv.includes('--force');

  // eslint-disable-next-line no-console
  console.log(`Connecting to database: ${config.mongodb.uri}`);
  await mongoose.connect(config.mongodb.uri, config.mongodb.options);

  try {
    const existingMoviesCount = await Movie.countDocuments();
    if (existingMoviesCount > 0 && !isForce) {
      // eslint-disable-next-line no-console
      console.log('Database already contains records. Run with --force to overwrite.');
      process.exit(0);
    }

    if (isForce) {
      // eslint-disable-next-line no-console
      console.log('Clearing existing collections (--force)...');
      await Promise.all([
        User.deleteMany({}),
        Movie.deleteMany({}),
        Theatre.deleteMany({}),
        Show.deleteMany({}),
        Seat.deleteMany({}),
        SeatLock.deleteMany({}),
        Booking.deleteMany({}),
        Notification.deleteMany({}),
      ]);
    }

    // eslint-disable-next-line no-console
    console.log('1. Seeding Users (Admin & Customer)...');
    const adminUser = await User.create({
      name: 'Sarah Connor (Admin)',
      email: 'admin@imovies.com',
      password: 'AdminPassword123!',
      role: 'ADMIN',
      phone: '+1 (555) 019-2834',
    });

    const demoUser = await User.create({
      name: 'Alex Johnson',
      email: 'user@imovies.com',
      password: 'UserPassword123!',
      role: 'USER',
      phone: '+1 (555) 843-9201',
      preferences: {
        genres: ['Sci-Fi', 'Action'],
        languages: ['English'],
      },
    });

    const testUser1 = await User.create({
      name: 'IMovies Customer One',
      email: 'imovies.user1@example.com',
      password: 'User1@IMovies2026!',
      role: 'USER',
      phone: '+1 (555) 101-0001',
      preferences: {
        genres: ['Sci-Fi', 'Action'],
        languages: ['English'],
      },
    });

    const testUser2 = await User.create({
      name: 'IMovies Customer Two',
      email: 'imovies.user2@example.com',
      password: 'User2@IMovies2026!',
      role: 'USER',
      phone: '+1 (555) 102-0002',
      preferences: {
        genres: ['Adventure', 'Drama'],
        languages: ['English'],
      },
    });

    // eslint-disable-next-line no-console
    console.log('2. Seeding Theatres & Auditoriums...');
    const theatre1 = await Theatre.create({
      name: 'IMovies Grand Cinema - Times Square',
      city: 'New York',
      address: { street: '1540 Broadway', postalCode: '10036', state: 'NY', country: 'USA' },
      phone: '+1 (212) 555-0144',
      screens: [
        { screenNumber: 1, name: 'Audi 1 (IMAX Laser)', format: 'IMAX Laser', totalCapacity: 120 },
        { screenNumber: 2, name: 'Audi 2 (Dolby Atmos)', format: 'Dolby Atmos', totalCapacity: 100 },
      ],
      facilities: ['IMAX Laser', 'Dolby Atmos', 'Recliner Seats', 'Gourmet Food'],
      accessibility: {
        wheelchairAccessible: true,
        assistiveListening: true,
        elevatorAccess: true,
        accessibleParking: true,
        accessibleRestrooms: true,
        details: 'Full step-free entrance, dedicated companion spaces, and hearing loops.',
      },
    });

    const theatre2 = await Theatre.create({
      name: 'IMovies Downtown Royale',
      city: 'New York',
      address: { street: '84 2nd Avenue', postalCode: '10003', state: 'NY', country: 'USA' },
      phone: '+1 (212) 555-0188',
      screens: [
        { screenNumber: 1, name: 'Audi 1 (VIP Lounge)', format: 'VIP Recliner', totalCapacity: 80 },
      ],
      facilities: ['Dolby Atmos', 'VIP Lounge', 'Wheelchair Accessible'],
      accessibility: {
        wheelchairAccessible: true,
        assistiveListening: true,
        details: 'Ramped street access, power doors, and assistive listening headsets.',
      },
    });

    // eslint-disable-next-line no-console
    console.log('3. Seeding Physical Screen Seats...');
    const physicalSeats = [];
    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach((row) => {
      const isVip = ['A', 'B'].includes(row);
      const isExecutive = ['C', 'D'].includes(row);
      const tier = isVip ? 'VIP' : isExecutive ? 'Executive' : 'Standard';
      const count = isVip ? 10 : 12;

      for (let num = 1; num <= count; num++) {
        physicalSeats.push({
          theatre: theatre1._id,
          screenNumber: 1,
          seatNumber: `${row}${num}`,
          row,
          number: num,
          tier,
          isAccessible: row === 'G' && (num === 1 || num === count),
        });
      }
    });
    await Seat.insertMany(physicalSeats);

    // eslint-disable-next-line no-console
    console.log('4. Seeding Movies Catalogue...');
    const moviesData = initialMovies.map((m) => {
      const copy = { ...m };
      delete copy._id;
      delete copy.id;
      return copy;
    });
    const createdMovies = await Movie.insertMany(moviesData);

    // eslint-disable-next-line no-console
    console.log('5. Seeding Shows & Schedules...');
    const now = new Date();
    const show1 = await Show.create({
      movie: createdMovies[0]._id,
      theatre: theatre1._id,
      screenNumber: 1,
      screenName: 'Audi 1 (IMAX Laser)',
      format: 'IMAX 2D',
      startTime: new Date(now.getTime() + 2 * 3600000), // In 2 hours
      endTime: new Date(now.getTime() + 5 * 3600000),
      timeZone: 'America/New_York',
      pricing: [
        { tier: 'VIP', price: 18.0 },
        { tier: 'Executive', price: 16.5 },
        { tier: 'Standard', price: 14.0 },
      ],
      status: 'SCHEDULED',
      totalSeats: 120,
      availableSeatsCount: 118,
    });

    const show2 = await Show.create({
      movie: createdMovies[1]._id,
      theatre: theatre2._id,
      screenNumber: 1,
      screenName: 'Audi 1 (VIP Lounge)',
      format: 'Dolby Atmos',
      startTime: new Date(now.getTime() + 4 * 3600000),
      endTime: new Date(now.getTime() + 6.5 * 3600000),
      timeZone: 'America/New_York',
      pricing: [
        { tier: 'VIP', price: 16.0 },
        { tier: 'Standard', price: 13.5 },
      ],
      status: 'SCHEDULED',
      totalSeats: 80,
      availableSeatsCount: 80,
    });

    // eslint-disable-next-line no-console
    console.log('6. Seeding Baseline Booking & Confirmed Seat Locks...');
    const booking1 = await Booking.create({
      bookingReference: 'BK-789412',
      user: demoUser._id,
      show: show1._id,
      theatre: theatre1._id,
      movie: createdMovies[0]._id,
      seats: [
        { seatNumber: 'A4', row: 'A', tier: 'VIP', price: 18.0 },
        { seatNumber: 'A5', row: 'A', tier: 'VIP', price: 18.0 },
      ],
      ticketCount: 2,
      pricing: {
        subtotal: 36.0,
        convenienceFee: 3.0,
        foodSubtotal: 0,
        totalAmount: 39.0,
        currency: 'USD',
      },
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      checkIn: {
        isCheckedIn: false,
        qrCodeReference: 'QR-BK-789412-INIT',
      },
    });

    await SeatLock.create([
      {
        show: show1._id,
        seatNumber: 'A4',
        user: demoUser._id,
        status: 'CONFIRMED',
        booking: booking1._id,
        expiresAt: new Date(Date.now() + 86400000 * 30),
      },
      {
        show: show1._id,
        seatNumber: 'A5',
        user: demoUser._id,
        status: 'CONFIRMED',
        booking: booking1._id,
        expiresAt: new Date(Date.now() + 86400000 * 30),
      },
    ]);

    // eslint-disable-next-line no-console
    console.log('7. Seeding Initial Notifications...');
    await Notification.create({
      recipient: demoUser._id,
      type: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed!',
      message: 'Your booking BK-789412 for Interstellar: Beyond Time is confirmed.',
      booking: booking1._id,
      show: show1._id,
    });

    // eslint-disable-next-line no-console
    console.log('========================================================');
    // eslint-disable-next-line no-console
    console.log('✅ IMovies Database Seed Completed Successfully!');
    // eslint-disable-next-line no-console
    console.log(`- Admin Account: admin@imovies.com / AdminPassword123!`);
    // eslint-disable-next-line no-console
    console.log(`- Customer Account: user@imovies.com / UserPassword123!`);
    // eslint-disable-next-line no-console
    console.log(`- Movies Seeded: ${createdMovies.length}`);
    // eslint-disable-next-line no-console
    console.log(`- Theatres Seeded: 2`);
    // eslint-disable-next-line no-console
    console.log(`- Shows Seeded: 2`);
    // eslint-disable-next-line no-console
    console.log('========================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Seeding failed with error:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

