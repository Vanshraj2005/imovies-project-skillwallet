const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config/env');

describe('IMovies Part 2 - Authentication, Authorization & REST API Tests', () => {
  let userToken = '';
  let adminToken = '';
  let otherUserToken = '';
  let createdBookingId = '';

  const testUser = {
    name: 'John Moviegoer',
    email: `john_${Date.now()}@test.com`,
    password: 'SecurePassword123!',
    phone: '+1 (555) 234-5678',
  };

  const testAdmin = {
    name: 'Admin Sarah',
    email: `admin_${Date.now()}@test.com`,
    password: 'AdminPassword123!',
    role: 'ADMIN',
  };

  const otherUser = {
    name: 'Alice Intruder',
    email: `alice_${Date.now()}@test.com`,
    password: 'AlicePassword123!',
  };

  // 1. REGISTRATION TESTS
  describe('User Registration (POST /api/v1/auth/register)', () => {
    it('1.1 should register a new USER successfully with hashed password and tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.role).toBe('USER');
      // Verify password hash is NEVER exposed in response
      expect(res.body.data.user).not.toHaveProperty('password');

      userToken = res.body.data.accessToken;
    });

    it('1.2 should reject registration with missing mandatory fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'incomplete@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/provide name, email, and password/i);
    });

    it('1.3 should reject registration with password shorter than 6 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Short Pass',
          email: 'shortpass@test.com',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/at least 6 characters/i);
    });

    it('2. should reject duplicate email registration with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  // 3. LOGIN & PASSWORD HASH TESTS
  describe('User Login (POST /api/v1/auth/login)', () => {
    it('3.1 should log in successfully with valid credentials and return access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('3.2 should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('3.3 should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent_account_xyz@test.com',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });
  });

  // Helper registration of Admin and Other User
  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/v1/auth/register')
      .send(testAdmin);
    if (adminRes.body.data?.accessToken) {
      adminToken = adminRes.body.data.accessToken;
    }

    const otherRes = await request(app)
      .post('/api/v1/auth/register')
      .send(otherUser);
    if (otherRes.body.data?.accessToken) {
      otherUserToken = otherRes.body.data.accessToken;
    }
  });

  // 5. TOKEN VALIDATION & EXPIRED CREDENTIALS
  describe('Token Verification & Auth Middleware', () => {
    it('5.1 should reject request with invalid/malformed token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_garbage_token_12345');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid authentication token/i);
    });

    it('5.2 should reject request with expired token', async () => {
      // Forge expired token
      const expiredToken = jwt.sign(
        { id: 'usr_test', email: 'test@test.com', role: 'USER' },
        config.jwt.secret,
        { expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired/i);
    });

    it('6. should reject protected endpoint access when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/users/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/authentication required/i);
    });

    it('should return current user profile on GET /api/v1/auth/me when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email.toLowerCase());
    });
  });

  // 7. ROLE-BASED ACCESS CONTROL (RBAC)
  describe('Role-Based Access Control (USER vs ADMIN)', () => {
    it('7.1 should DENY a standard USER from creating a movie (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/movies')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Unauthorized Movie Attempt',
          genre: ['Action'],
          duration: 120,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/access denied: role 'user'/i);
    });

    it('7.2 should DENY a standard USER from accessing admin analytics overview (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('7.3 should ALLOW an ADMIN to access admin analytics overview (200 OK)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('metrics');
    });

    it('7.4 should ALLOW an ADMIN to create a new movie (201 Created)', async () => {
      const res = await request(app)
        .post('/api/v1/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Admin Created Cinema Feature',
          genre: ['Sci-Fi', 'Adventure'],
          duration: 155,
          language: 'English',
          certificate: 'PG-13',
          synopsis: 'Authorized movie created by cinema administrator.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Admin Created Cinema Feature');
    });
  });

  // 8. OBJECT-LEVEL AUTHORIZATION & BOOKINGS
  describe('Booking Operations & Object-Level Permission Enforcement', () => {
    it('should allow user to create a booking with server-side price calculation', async () => {
      const bookingPayload = {
        showId: 'sh101',
        seats: [
          { seatNumber: 'C1', row: 'C', tier: 'Executive', price: 14.5 },
          { seatNumber: 'C2', row: 'C', tier: 'Executive', price: 14.5 },
        ],
        foodSubtotal: 8.5,
      };

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Authorization', `Bearer ${userToken}`)
        .send(bookingPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('bookingReference');
      expect(res.body.data.ticketCount).toBe(2);
      expect(res.body.data.pricing.totalAmount).toBe(40.5); // 29.0 tickets + 3.0 fee + 8.5 food

      createdBookingId = res.body.data._id || res.body.data.id;
    });

    it('8. should PREVENT User B from accessing User A’s booking (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${createdBookingId}`)
        .set('Authorization', `Bearer ${otherUserToken}`); // Alice tries to view John's booking

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/permission to view or manage another customer/i);
    });

    it('should ALLOW the booking owner (User A) to view their own booking (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${createdBookingId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('bookingReference');
    });

    it('should ALLOW ADMIN to view any booking across the system (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${createdBookingId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should allow user to cancel their own booking', async () => {
      const res = await request(app)
        .post(`/api/v1/bookings/${createdBookingId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ reason: 'Schedule conflict' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
    });
  });

  // 9 & 10. CRUD VALIDATION FAILURES & INVALID REFERENCES
  describe('CRUD Validation Failures & References', () => {
    it('9. should return 404 for a non-existent show ID', async () => {
      const res = await request(app).get('/api/v1/shows/non_existent_show_9999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('10. should return 400 when creating a theatre without required address', async () => {
      const res = await request(app)
        .post('/api/v1/theatres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Theatre Without City or Address' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/name, city, and address are required/i);
    });
  });

  // 11. SEARCH & PAGINATION PARAMETERS
  describe('Search & Pagination Parameters', () => {
    it('11.1 should filter shows by theatreId', async () => {
      const res = await request(app).get('/api/v1/shows?theatreId=th101');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('11.2 should return paginated list of movies with metadata', async () => {
      const res = await request(app).get('/api/v1/movies?page=1&limit=3');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(3);
      expect(res.body.data.length).toBeLessThanOrEqual(3);
    });
  });

  // 12. SEAT HOLD CONCURRENCY PROTECTION
  describe('Seat Hold Concurrency & Anti-Double-Booking Protection', () => {
    it('should hold seats for a user session for 10 minutes', async () => {
      const res = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          showId: 'sh101',
          seatNumbers: ['B1', 'B2'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.holdMinutes).toBe(10);
    });

    it('12. should REJECT a conflicting hold from another user on the same seats (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/v1/seats/hold')
        .set('Authorization', `Bearer ${otherUserToken}`) // Alice attempts to hold seats John already holds
        .send({
          showId: 'sh101',
          seatNumbers: ['B2', 'B3'], // B2 collides!
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already held or booked/i);
    });
  });
});
