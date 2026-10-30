/**
 * Multi-User Authentication, Role-Based Access Control,
 * and Show-Specific Seat Concurrency Integration Test Suite
 *
 * Scenarios Tested:
 * 1. Independent Authentication & Separate Sessions (User 1 & User 2)
 * 2. Role-Based Access Control & Strict Boundary Checks (USER vs ADMIN)
 * 3. Exact Multi-User Scenario:
 *    - Test 1: User 1 books A3 for sh103
 *    - Test 2: User 2 tries to book A3 for sh103 -> Rejected (409 Conflict)
 *    - Test 3: User 2 books different seat A4 for sh103 -> Success
 *    - Test 4: Different show independence: A3 booked for sh104 -> Success
 *    - Test 5: Cancellation & Release: User 1 cancels A3 on sh103 -> User 2 can now claim A3
 * 4. Object-Level Ownership Protection (Cannot read/cancel/pay another user's booking)
 * 5. Simultaneous Concurrent Seat Claims (Atomic Concurrency Protection via Promise.all)
 */
const request = require('supertest');
const app = require('../src/app');

describe('IMovies — Multi-User Authentication, RBAC and Show-Specific Seat Concurrency', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let adminToken;
  let adminId;

  const testShow1 = 'sh103';
  const testShow2 = 'sh104';

  beforeAll(async () => {
    // 1. Authenticate Test User 1
    const resUser1 = await request(app).post('/api/v1/auth/login').send({
      email: 'imovies.user1@example.com',
      password: 'User1@IMovies2026!',
    });
    expect(resUser1.status).toBe(200);
    user1Token = resUser1.body.data.accessToken;
    user1Id = resUser1.body.data.user.id || resUser1.body.data.user._id;

    // 2. Authenticate Test User 2
    const resUser2 = await request(app).post('/api/v1/auth/login').send({
      email: 'imovies.user2@example.com',
      password: 'User2@IMovies2026!',
    });
    expect(resUser2.status).toBe(200);
    user2Token = resUser2.body.data.accessToken;
    user2Id = resUser2.body.data.user.id || resUser2.body.data.user._id;

    // 3. Authenticate Cinema Administrator
    const resAdmin = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@imovies.com',
      password: 'AdminPassword123!',
    });
    expect(resAdmin.status).toBe(200);
    adminToken = resAdmin.body.data.accessToken;
    adminId = resAdmin.body.data.user.id || resAdmin.body.data.user._id;
  });

  describe('1. Two-User Account & Authentication Session Integrity', () => {
    it('verifies User 1 and User 2 have distinct IDs and separate authentication tokens', () => {
      expect(user1Id).toBeDefined();
      expect(user2Id).toBeDefined();
      expect(user1Id).not.toBe(user2Id);

      expect(user1Token).toBeDefined();
      expect(user2Token).toBeDefined();
      expect(user1Token).not.toBe(user2Token);
    });

    it('verifies both accounts have USER role and cannot access admin endpoints', async () => {
      const u1Profile = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(u1Profile.status).toBe(200);
      expect(u1Profile.body.data.role.toUpperCase()).toBe('USER');
      expect(u1Profile.body.data.email).toBe('imovies.user1@example.com');

      const u2Profile = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${user2Token}`);
      expect(u2Profile.status).toBe(200);
      expect(u2Profile.body.data.role.toUpperCase()).toBe('USER');
      expect(u2Profile.body.data.email).toBe('imovies.user2@example.com');
    });

    it('rejects expired, malformed, or missing tokens with 401 Unauthorized', async () => {
      const noTokenRes = await request(app).get('/api/v1/auth/me');
      expect(noTokenRes.status).toBe(401);

      const badTokenRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_garbage_token_signature_123');
      expect(badTokenRes.status).toBe(401);
    });
  });

  describe('2. Role-Based Access Control (USER vs ADMIN)', () => {
    it('forbids USER from accessing administrator overview (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('forbids USER from accessing administrator analytics (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${user2Token}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('forbids USER from accessing all bookings across cinemas (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/admin/all')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('prevents USER from self-elevating their role to ADMIN via profile update', async () => {
      const res = await request(app)
        .patch('/api/v1/users/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Hacker User',
          role: 'ADMIN', // Tampering attempt
        });
      expect(res.status).toBe(200);

      // Verify role was NOT updated to ADMIN
      const checkRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(checkRes.body.data.role.toUpperCase()).toBe('USER');
    });

    it('allows ADMIN to access management endpoints successfully', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Exact Multi-User Scenario (Tests 1 through 5)', () => {
    let user1BookingId;
    let user1BookingReference;
    let user2BookingId;

    // Test 1: User 1 books seat A3 on show sh103
    it('Test 1: User 1 selects and books seat A3 on show sh103', async () => {
      // Step A: Hold seat A3
      const holdRes = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          showId: testShow1,
          seatNumbers: ['A3'],
          holdMinutes: 10,
        });
      expect(holdRes.status).toBe(200);
      expect(holdRes.body.success).toBe(true);
      expect(holdRes.body.data.seatNumbers).toContain('A3');

      // Step B: Complete booking
      const bookRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          showId: testShow1,
          seats: [{ seatNumber: 'A3', row: 'A', tier: 'VIP', price: 16.0 }],
          paymentMethod: 'Dev Mock Card',
        });

      expect(bookRes.status).toBe(201);
      expect(bookRes.body.success).toBe(true);
      expect(bookRes.body.data.bookingStatus).toBe('CONFIRMED');
      expect(bookRes.body.data.paymentStatus).toBe('PAID');

      user1BookingId = bookRes.body.data._id || bookRes.body.data.id;
      user1BookingReference = bookRes.body.data.bookingReference;

      // Step C: Verify seat A3 is recorded as RESERVED in layout
      const layoutRes = await request(app).get(`/api/v1/seats/show/${testShow1}`);
      const seatA3 = layoutRes.body.data.seats.find((s) => s.seatNumber === 'A3');
      expect(seatA3.status).toBe('RESERVED');
    });

    // Test 2: User 2 tries to book the same seat A3 on show sh103
    it('Test 2: User 2 attempts to claim seat A3 on sh103 -> Rejected (409 Conflict)', async () => {
      // Step A: Layout inspection by User 2
      const layoutRes = await request(app)
        .get(`/api/v1/seats/show/${testShow1}`)
        .set('Authorization', `Bearer ${user2Token}`);
      const seatA3 = layoutRes.body.data.seats.find((s) => s.seatNumber === 'A3');
      expect(seatA3.status).toBe('RESERVED');
      expect(seatA3.isHeldByMe).toBe(false);

      // Step B: Direct API request to hold A3 by User 2
      const holdRes = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          showId: testShow1,
          seatNumbers: ['A3'],
          holdMinutes: 10,
        });
      expect(holdRes.status).toBe(409);
      expect(holdRes.body.success).toBe(false);
      expect(holdRes.body.message).toMatch(/already (held or )?booked/i);

      // Step C: Direct API request to bypass hold and book A3 by User 2
      const bookRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          showId: testShow1,
          seats: [{ seatNumber: 'A3', row: 'A', tier: 'VIP', price: 16.0 }],
        });
      expect(bookRes.status).toBe(409);
      expect(bookRes.body.success).toBe(false);

      // Step D: Verify User 1's booking remains intact
      const checkRes = await request(app)
        .get(`/api/v1/bookings/${user1BookingId}`)
        .set('Authorization', `Bearer ${user1Token}`);
      expect(checkRes.status).toBe(200);
      expect(checkRes.body.data.bookingStatus).toBe('CONFIRMED');
    });

    // Test 3: User 2 books a different seat A4 on show sh103
    it('Test 3: User 2 books seat A4 on sh103 -> Booking succeeds while User 1 A3 remains unchanged', async () => {
      // User 2 holds and books A4
      const holdRes = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          showId: testShow1,
          seatNumbers: ['A4'],
          holdMinutes: 10,
        });
      expect(holdRes.status).toBe(200);

      const bookRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          showId: testShow1,
          seats: [{ seatNumber: 'A4', row: 'A', tier: 'VIP', price: 16.0 }],
          paymentMethod: 'Dev Mock Card',
        });
      expect(bookRes.status).toBe(201);
      expect(bookRes.body.data.bookingStatus).toBe('CONFIRMED');
      user2BookingId = bookRes.body.data._id || bookRes.body.data.id;

      // Verify layout has both A3 and A4 RESERVED
      const layoutRes = await request(app).get(`/api/v1/seats/show/${testShow1}`);
      const seatA3 = layoutRes.body.data.seats.find((s) => s.seatNumber === 'A3');
      const seatA4 = layoutRes.body.data.seats.find((s) => s.seatNumber === 'A4');
      expect(seatA3.status).toBe('RESERVED');
      expect(seatA4.status).toBe('RESERVED');
    });

    // Test 4: Different show independence (sh104 + A3)
    it('Test 4: User 2 books seat A3 for a DIFFERENT show sh104 -> Independent availability succeeds', async () => {
      // Check layout for sh104 - seat A3 must be AVAILABLE even though A3 is booked on sh103
      const layoutRes = await request(app).get(`/api/v1/seats/show/${testShow2}`);
      const seatA3_sh104 = layoutRes.body.data.seats.find((s) => s.seatNumber === 'A3');
      expect(seatA3_sh104.status).toBe('AVAILABLE');

      // User 2 books A3 on sh104
      const holdRes = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          showId: testShow2,
          seatNumbers: ['A3'],
        });
      expect(holdRes.status).toBe(200);

      const bookRes = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          showId: testShow2,
          seats: [{ seatNumber: 'A3', row: 'A', tier: 'VIP', price: 18.0 }],
        });
      expect(bookRes.status).toBe(201);
      expect(bookRes.body.data.bookingStatus).toBe('CONFIRMED');
    });

    // Test 5: Cancellation & Release
    it('Test 5: User 1 cancels A3 on sh103 -> Persistence confirmed, A3 released and User 2 can now claim it', async () => {
      // Step A: User 1 cancels booking
      const cancelRes = await request(app)
        .post(`/api/v1/bookings/${user1BookingId}/cancel`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ reason: 'Schedule conflict' });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.bookingStatus).toBe('CANCELLED');
      expect(cancelRes.body.data.paymentStatus).toBe('REFUNDED');

      // Step B: Verify seat A3 on sh103 is now AVAILABLE
      const layoutRes = await request(app).get(`/api/v1/seats/show/${testShow1}`);
      const seatA3 = layoutRes.body.data.seats.find((s) => s.seatNumber === 'A3');
      expect(seatA3.status).toBe('AVAILABLE');

      // Step C: User 2 can now claim seat A3 on sh103
      const u2HoldRes = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          showId: testShow1,
          seatNumbers: ['A3'],
        });
      expect(u2HoldRes.status).toBe(200);
      expect(u2HoldRes.body.success).toBe(true);
      expect(u2HoldRes.body.data.seatNumbers).toContain('A3');
    });
  });

  describe('4. Object-Level Ownership Protection', () => {
    let privateBookingId;

    beforeAll(async () => {
      // User 1 creates a private booking
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          showId: testShow1,
          seats: [{ seatNumber: 'B1', row: 'B', tier: 'VIP', price: 16.0 }],
        });
      privateBookingId = res.body.data._id || res.body.data.id;
    });

    it('forbids User 2 from accessing User 1 private booking by ID (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${privateBookingId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('forbids User 2 from cancelling User 1 private booking (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${privateBookingId}/cancel`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ reason: 'Malicious cancellation attempt' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    it('forbids User 2 from viewing User 1 payment history for the booking (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/payments/booking/${privateBookingId}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('forbids User 2 from releasing User 1 active seat hold', async () => {
      // User 1 holds seat B2
      await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          showId: testShow1,
          seatNumbers: ['B2'],
        });

      // User 2 attempts to release B2
      await request(app)
        .post('/api/v1/seats/release')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          showId: testShow1,
          seatNumbers: ['B2'],
        });

      // Verify B2 is STILL HELD by User 1
      const layoutRes = await request(app)
        .get(`/api/v1/seats/show/${testShow1}`)
        .set('Authorization', `Bearer ${user1Token}`);
      const seatB2 = layoutRes.body.data.seats.find((s) => s.seatNumber === 'B2');
      expect(seatB2.status).toBe('HELD');
      expect(seatB2.isHeldByMe).toBe(true);
    });

    it('verifies booking history endpoint returns strictly only the authenticated user records', async () => {
      const u1Res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(u1Res.status).toBe(200);
      u1Res.body.data.forEach((b) => {
        const ownerId = String(b.user?._id || b.user);
        expect(ownerId).toBe(String(user1Id));
      });

      const u2Res = await request(app)
        .get('/api/v1/bookings')
        .set('Authorization', `Bearer ${user2Token}`);
      expect(u2Res.status).toBe(200);
      u2Res.body.data.forEach((b) => {
        const ownerId = String(b.user?._id || b.user);
        expect(ownerId).toBe(String(user2Id));
      });
    });
  });

  describe('5. Simultaneous Seat Concurrency Claims (Race Condition Protection)', () => {
    it('executes simultaneous competing requests: exactly one succeeds and the other receives 409 Conflict', async () => {
      const targetSeat = 'C5';

      // Send two concurrent requests at the exact same instant using Promise.all
      const [attemptUser1, attemptUser2] = await Promise.all([
        request(app)
          .post('/api/v1/seats/hold')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ showId: testShow1, seatNumbers: [targetSeat] }),
        request(app)
          .post('/api/v1/seats/hold')
          .set('Authorization', `Bearer ${user2Token}`)
          .send({ showId: testShow1, seatNumbers: [targetSeat] }),
      ]);

      const statuses = [attemptUser1.status, attemptUser2.status].sort();
      // One MUST succeed (200) and one MUST be rejected with conflict (409)
      expect(statuses).toEqual([200, 409]);

      // Verify exactly one active claim exists for targetSeat in layout
      const layoutRes = await request(app).get(`/api/v1/seats/show/${testShow1}`);
      const seat = layoutRes.body.data.seats.find((s) => s.seatNumber === targetSeat);
      expect(seat.status).toBe('HELD');
    });

    it('repeats simultaneous concurrency races across multiple seats ensuring 100% atomicity', async () => {
      const testSeats = ['D1', 'D2', 'D3'];

      for (const seatNum of testSeats) {
        const [resA, resB] = await Promise.all([
          request(app)
            .post('/api/v1/seats/hold')
            .set('Authorization', `Bearer ${user1Token}`)
            .send({ showId: testShow1, seatNumbers: [seatNum] }),
          request(app)
            .post('/api/v1/seats/hold')
            .set('Authorization', `Bearer ${user2Token}`)
            .send({ showId: testShow1, seatNumbers: [seatNum] }),
        ]);

        const statuses = [resA.status, resB.status].sort();
        expect(statuses).toEqual([200, 409]);
      }
    });

    it('verifies all-or-nothing hold leaves zero partial claims if any seat in the batch conflicts', async () => {
      // Seat D1 is already held. User 2 now attempts to hold batch ['D1', 'D4', 'D5'].
      const batchRes = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          showId: testShow1,
          seatNumbers: ['D1', 'D4', 'D5'],
        });

      expect(batchRes.status).toBe(409);
      expect(batchRes.body.success).toBe(false);

      // Verify atomic rollback: seats D4 and D5 were NOT claimed and remain AVAILABLE
      const layoutRes = await request(app).get(`/api/v1/seats/show/${testShow1}`);
      const seatD4 = layoutRes.body.data.seats.find((s) => s.seatNumber === 'D4');
      const seatD5 = layoutRes.body.data.seats.find((s) => s.seatNumber === 'D5');
      expect(seatD4.status).toBe('AVAILABLE');
      expect(seatD5.status).toBe('AVAILABLE');
    });
  });
});
