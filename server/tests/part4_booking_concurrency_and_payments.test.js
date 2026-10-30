/**
 * Part 4 Verification Test Suite
 * Covers Seat Concurrency & All-or-Nothing Holds, Smart Seat Advisor,
 * Idempotent Payments, Booking Confirmation, Atomic QR Check-In, and Cancellations.
 */
const request = require('supertest');
const app = require('../src/app');

describe('IMovies Part 4 — Booking Engine, Concurrency, Payments & Admissions Tests', () => {
  let userAToken;
  let userBToken;
  let adminToken;
  const testShowId = 'sh_part4_test';

  beforeAll(async () => {
    const timestamp = Date.now();

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      name: 'Customer A',
      email: `customer_a_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'USER',
    });
    userAToken = resA.body.data.accessToken;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      name: 'Customer B',
      email: `customer_b_${timestamp}@test.com`,
      password: 'Password123!',
      role: 'USER',
    });
    userBToken = resB.body.data.accessToken;

    // Register Admin / Staff
    const resAdmin = await request(app).post('/api/v1/auth/register').send({
      name: 'Staff Scanner Admin',
      email: `staff_admin_${timestamp}@test.com`,
      password: 'AdminPassword123!',
      role: 'ADMIN',
    });
    adminToken = resAdmin.body.data.accessToken;
  });

  describe('1. Concurrency Protection & All-or-Nothing Multi-Seat Holds', () => {
    it('successfully holds available seats and returns unique holdId and expiresAt', async () => {
      const res = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          showId: testShowId,
          seatNumbers: ['C5', 'C6'],
          holdMinutes: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.holdId).toBeDefined();
      expect(res.body.data.expiresAt).toBeDefined();
      expect(res.body.data.seatNumbers).toEqual(['C5', 'C6']);
    });

    it('rejects a concurrent hold attempt from User B on the exact same seats with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          showId: testShowId,
          seatNumbers: ['C5'],
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already held or booked/i);
    });

    it('enforces all-or-nothing hold: if 1 seat in a requested group is taken, 0 seats are held', async () => {
      // User A currently holds C5 and C6. User B requests ['C6', 'C7', 'C8'].
      // Because C6 is held by User A, User B must receive 409 and C7, C8 must NOT be held!
      const res = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          showId: testShowId,
          seatNumbers: ['C6', 'C7', 'C8'],
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);

      // Verify that C7 was NOT locked and remains available
      const layoutRes = await request(app).get(`/api/v1/seats/show/${testShowId}`);
      expect(layoutRes.status).toBe(200);
      const seatC7 = layoutRes.body.data.seats.find((s) => s.seatNumber === 'C7');
      expect(seatC7.status).toBe('AVAILABLE');
    });

    it('allows idempotent seat release by the owning user', async () => {
      const releaseRes = await request(app)
        .post('/api/v1/seats/release')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          showId: testShowId,
          seatNumbers: ['C5', 'C6'],
        });

      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.success).toBe(true);

      // Verify seats are now available for User B
      const holdRes = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          showId: testShowId,
          seatNumbers: ['C5'],
        });

      expect(holdRes.status).toBe(200);
      expect(holdRes.body.success).toBe(true);
    });
  });

  describe('2. Smart Seat Advisor Recommendations', () => {
    it('recommends contiguous sweet-spot center seats based on party size', async () => {
      const res = await request(app)
        .post('/api/v1/seats/recommend')
        .send({
          showId: testShowId,
          groupSize: 2,
          preference: 'center',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recommendedSeats.length).toBe(2);
      expect(res.body.data.explanation).toMatch(/center/i);
    });

    it('recommends wheelchair-accessible seats when preference is accessible', async () => {
      const res = await request(app)
        .post('/api/v1/seats/recommend')
        .send({
          showId: testShowId,
          groupSize: 1,
          preference: 'accessible',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recommendedSeats[0]).toMatch(/^G(1|12)$/);
      expect(res.body.data.explanation).toMatch(/accessible/i);
    });
  });

  describe('3. Payment Processing & Idempotency Guarantee', () => {
    const idempotencyKey = `idem_test_${Date.now()}`;

    it('processes a mock payment successfully under dev_mock provider', async () => {
      const res = await request(app)
        .post('/api/v1/payments/process')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          showId: testShowId,
          amount: 32.50,
          provider: 'dev_mock',
          idempotencyKey,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.provider).toBe('dev_mock');
      expect(res.body.data.transactionId).toMatch(/^TXN-DEV_MOCK/i);
    });

    it('prevents double charges when the same idempotency key is submitted again', async () => {
      const replayRes = await request(app)
        .post('/api/v1/payments/process')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          showId: testShowId,
          amount: 32.50,
          provider: 'dev_mock',
          idempotencyKey,
        });

      expect(replayRes.status).toBe(200);
      expect(replayRes.body.success).toBe(true);
      expect(replayRes.body.data.isIdempotentReplay).toBe(true);
    });

    it('gracefully handles simulated card decline when simulateFailure: true is passed', async () => {
      const res = await request(app)
        .post('/api/v1/payments/process')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          showId: testShowId,
          amount: 32.50,
          provider: 'dev_mock',
          simulateFailure: true,
        });

      expect(res.status).toBe(402);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/declined/i);
    });
  });

  describe('4. Authoritative Booking Confirmation & State Transitions', () => {
    let createdBookingReference;
    let createdBookingId;

    it('creates a confirmed booking with server-calculated pricing and QR reference', async () => {
      // First hold seats E1 and E2
      await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          showId: testShowId,
          seatNumbers: ['E1', 'E2'],
        });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          showId: testShowId,
          seats: [
            { id: 'E1', seatNumber: 'E1', row: 'E', tier: 'Standard', price: 999.0 }, // Tampered price attempt
            { id: 'E2', seatNumber: 'E2', row: 'E', tier: 'Standard', price: 999.0 },
          ],
          foodSubtotal: 8.50,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const booking = res.body.data;

      // Server enforces official standard pricing ($12.50 x 2 = $25.00) + $3.00 fee + $8.50 food = $36.50
      expect(booking.pricing.subtotal).toBe(25.0);
      expect(booking.pricing.convenienceFee).toBe(3.0);
      expect(booking.pricing.totalAmount).toBe(36.5);

      // Separate status fields
      expect(booking.bookingStatus).toBe('CONFIRMED');
      expect(booking.paymentStatus).toBe('PAID');
      expect(booking.cancellation.cancellationStatus).toBe('NONE');
      expect(booking.checkIn.isCheckedIn).toBe(false);
      expect(booking.checkIn.qrCodeReference).toMatch(/^IMOVIES-TICKET-BK-/);

      createdBookingReference = booking.bookingReference;
      createdBookingId = booking._id || booking.id;
    });

    it('rejects double-booking on seats that are already confirmed', async () => {
      const res = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          showId: testShowId,
          seatNumbers: ['E1'],
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    describe('5. Ticket QR Check-In & Atomic Scan Idempotency', () => {
      it('successfully checks in a guest using their booking reference', async () => {
        const res = await request(app)
          .post('/api/v1/bookings/check-in')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            bookingReference: createdBookingReference,
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('CHECKED_IN');
        expect(res.body.data.checkedInAt).toBeDefined();
      });

      it('atomically REJECTS duplicate/second scans for an already checked-in ticket', async () => {
        const res = await request(app)
          .post('/api/v1/bookings/check-in')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            bookingReference: createdBookingReference,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/duplicate scan rejected/i);
      });
    });

    describe('6. Cancellation Policy & Seat Release', () => {
      let cancellableBookingId;
      let cancellableBookingRef;

      beforeAll(async () => {
        // Hold and book seats F1, F2 for cancellation test
        await request(app)
          .post('/api/v1/seats/hold')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            showId: testShowId,
            seatNumbers: ['F1', 'F2'],
          });

        const res = await request(app)
          .post('/api/v1/bookings')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            showId: testShowId,
            seats: [
              { seatNumber: 'F1', row: 'F', tier: 'Standard', price: 12.5 },
              { seatNumber: 'F2', row: 'F', tier: 'Standard', price: 12.5 },
            ],
          });

        cancellableBookingId = res.body.data._id || res.body.data.id;
        cancellableBookingRef = res.body.data.bookingReference;
      });

      it('cancels eligible booking, initiates refund, and releases seats back to inventory', async () => {
        const cancelRes = await request(app)
          .post(`/api/v1/bookings/${cancellableBookingId}/cancel`)
          .set('Authorization', `Bearer ${userAToken}`)
          .send({ reason: 'Schedule conflict' });

        expect(cancelRes.status).toBe(200);
        expect(cancelRes.body.success).toBe(true);
        expect(cancelRes.body.data.status).toBe('CANCELLED');

        // Verify seats F1 and F2 are immediately available again
        const layoutRes = await request(app).get(`/api/v1/seats/show/${testShowId}`);
        const seatF1 = layoutRes.body.data.seats.find((s) => s.seatNumber === 'F1');
        expect(seatF1.status).toBe('AVAILABLE');

        // Another customer can now hold F1
        const newHoldRes = await request(app)
          .post('/api/v1/seats/hold')
          .set('Authorization', `Bearer ${userBToken}`)
          .send({
            showId: testShowId,
            seatNumbers: ['F1'],
          });
        expect(newHoldRes.status).toBe(200);
      });

      it('rejects check-in for a cancelled ticket', async () => {
        const res = await request(app)
          .post('/api/v1/bookings/check-in')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            bookingReference: cancellableBookingRef,
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/cancelled/i);
      });
    });
  });
});
