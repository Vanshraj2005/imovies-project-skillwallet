/**
 * Part 3 Verification Test Suite
 * Covers Movie Discovery, Search & Filters, Show Scheduling Conflict Prevention,
 * Theatre Management, and Admin Oversight.
 */
const request = require('supertest');
const app = require('../src/app');

describe('IMovies Part 3 — Discovery, Scheduling & Administration Tests', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    const timestamp = Date.now();

    // Register admin user
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Cinema Admin P3',
      email: `admin_p3_${timestamp}@test.com`,
      password: 'AdminPassword123!',
      role: 'ADMIN',
    });
    adminToken = adminRes.body.data.accessToken;

    // Register customer user
    const userRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Customer P3',
      email: `customer_p3_${timestamp}@test.com`,
      password: 'UserPassword123!',
      role: 'USER',
    });
    userToken = userRes.body.data.accessToken;
  });

  describe('1. Movie Search, Multi-Criteria Filtering & Pagination', () => {
    it('supports debounced/query text search across title and metadata', async () => {
      const res = await request(app).get('/api/v1/movies?search=Interstellar');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].title).toMatch(/Interstellar/i);
    });

    it('combines genre and language filters correctly', async () => {
      const res = await request(app).get('/api/v1/movies?genre=Sci-Fi&language=English');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach((m) => {
        expect(m.genre).toContain('Sci-Fi');
        expect(m.language).toBe('English');
      });
    });

    it('supports pagination with page and limit boundaries', async () => {
      const res = await request(app).get('/api/v1/movies?page=1&limit=2');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.meta.totalPages).toBeGreaterThanOrEqual(1);
    });

    it('sorts movies by title alphabetically', async () => {
      const res = await request(app).get('/api/v1/movies?sort=title');
      expect(res.status).toBe(200);
      if (res.body.data.length >= 2) {
        const first = res.body.data[0].title.toLowerCase();
        const second = res.body.data[1].title.toLowerCase();
        expect(first.localeCompare(second)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('2. Show Scheduling & Overlap Conflict Prevention', () => {
    let createdShowId;
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 2); // 2 days in future
    const dateStr = baseDate.toISOString().split('T')[0];

    const showStart = `${dateStr}T14:00:00.000Z`;
    const showEnd = `${dateStr}T16:30:00.000Z`;

    it('allows an authorized admin to schedule a new show on a screen', async () => {
      const payload = {
        movie: 'm101',
        theatre: 'th101',
        screenNumber: 2,
        screenName: 'Audi 2 (IMAX Laser)',
        format: 'IMAX 2D',
        startTime: showStart,
        endTime: showEnd,
        pricing: [
          { tier: 'VIP', price: 18.0 },
          { tier: 'Standard', price: 13.5 },
        ],
        totalSeats: 120,
      };

      const res = await request(app)
        .post('/api/v1/shows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('screenNumber', 2);
      createdShowId = res.body.data._id || res.body.data.id;
    });

    it('rejects show scheduling when start time is after end time (400 Bad Request)', async () => {
      const invalidPayload = {
        movie: 'm101',
        theatre: 'th101',
        screenNumber: 2,
        startTime: `${dateStr}T18:00:00.000Z`,
        endTime: `${dateStr}T16:00:00.000Z`, // Invalid end precedes start
        pricing: [{ tier: 'Standard', price: 12.0 }],
      };

      const res = await request(app)
        .post('/api/v1/shows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/precede/i);
    });

    it('prevents overlapping schedules on the same screen (409 Conflict)', async () => {
      // Attempt to schedule another show on theatre th101, screenNumber 2 from 15:00 to 17:30 (overlaps with 14:00 - 16:30)
      const conflictingPayload = {
        movie: 'm102',
        theatre: 'th101',
        screenNumber: 2,
        startTime: `${dateStr}T15:00:00.000Z`,
        endTime: `${dateStr}T17:30:00.000Z`,
        pricing: [{ tier: 'Standard', price: 14.0 }],
      };

      const res = await request(app)
        .post('/api/v1/shows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(conflictingPayload);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Scheduling conflict/i);
    });

    it('allows scheduling a show on a DIFFERENT screen at the exact same time', async () => {
      // Screen 3 at the same time is completely valid!
      const nonConflictingPayload = {
        movie: 'm102',
        theatre: 'th101',
        screenNumber: 3, // Different screen
        startTime: showStart,
        endTime: showEnd,
        pricing: [{ tier: 'Standard', price: 12.5 }],
      };

      const res = await request(app)
        .post('/api/v1/shows')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(nonConflictingPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('allows an admin to cancel a show safely without deleting references', async () => {
      if (!createdShowId) return;

      const res = await request(app)
        .delete(`/api/v1/shows/${createdShowId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Theatre Management CRUD by Admin', () => {
    let createdTheatreId;

    it('allows an admin to register a new cinema venue with screens & accessibility', async () => {
      const payload = {
        name: 'IMovies Metro Cineplex',
        city: 'Chicago',
        address: { street: '500 N Michigan Ave', city: 'Chicago' },
        phone: '+1 (312) 555-0199',
        screens: [
          { screenNumber: 1, name: 'Audi 1', format: 'IMAX 2D', totalCapacity: 150 },
          { screenNumber: 2, name: 'Audi 2', format: 'Dolby Atmos', totalCapacity: 120 },
        ],
        facilities: ['Dolby Atmos', 'Recliner Seats', 'Valet Parking'],
        accessibility: {
          wheelchairAccessible: true,
          assistiveListening: true,
          captioningAvailable: true,
        },
      };

      const res = await request(app)
        .post('/api/v1/theatres')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('IMovies Metro Cineplex');
      createdTheatreId = res.body.data._id || res.body.data.id;
    });

    it('rejects regular customer attempting to create theatre (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/theatres')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Unauthorized Cinema', city: 'Chicago', address: '123 St' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('allows an admin to update cinema metadata', async () => {
      if (!createdTheatreId) return;

      const res = await request(app)
        .put(`/api/v1/theatres/${createdTheatreId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ facilities: ['Dolby Atmos', 'VIP Lounge', 'Recliner Seats'] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('retrieves cinemas with city filter', async () => {
      const res = await request(app).get('/api/v1/theatres?city=Chicago');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('4. Booking Administration & Oversight', () => {
    it('allows an admin to review all bookings with status filter', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/admin/all?status=CONFIRMED&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('meta');
    });

    it('denies customer access to admin booking oversight (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/v1/bookings/admin/all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('retrieves consolidated admin operations overview with live metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('metrics');
      expect(res.body.data.metrics).toHaveProperty('totalRevenue');
      expect(res.body.data.metrics).toHaveProperty('activeTheatresCount');
      expect(res.body.data.metrics).toHaveProperty('activeShowsCount');
      expect(Array.isArray(res.body.data.recentBookings)).toBe(true);
    });
  });
});

