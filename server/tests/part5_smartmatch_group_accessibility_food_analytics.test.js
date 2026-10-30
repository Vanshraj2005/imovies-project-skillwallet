/**
 * Part 5 Verification Test Suite
 * Covers SmartMatch Recommendations, Group Movie Night Planning,
 * Accessible Cinema Finder, Food Pre-Ordering Concessions,
 * and Cinema Intelligence Analytics Dashboard.
 */
const request = require('supertest');
const app = require('../src/app');
const mongoose = require('mongoose');

describe('IMovies Part 5 — SmartMatch, Group Movie Nights, Accessibility, Concessions & Analytics', () => {
  let user1Token;
  let user1Id;
  let user2Token;
  let user2Id;
  let adminToken;
  let movie1Id;
  let movie2Id;
  let accessibleTheatreId;
  let regularTheatreId;
  let accessibleShowId;
  let regularShowId;

  beforeAll(async () => {
    const ts = Date.now();

    // Register User 1 (Moviegoer)
    const resU1 = await request(app).post('/api/v1/auth/register').send({
      name: 'Alex Moviegoer',
      email: `alex_${ts}@test.com`,
      password: 'Password123!',
      role: 'USER',
    });
    user1Token = resU1.body.data.accessToken;
    user1Id = resU1.body.data.user.id || resU1.body.data.user._id;

    // Register User 2 (Friend)
    const resU2 = await request(app).post('/api/v1/auth/register').send({
      name: 'Sam Partner',
      email: `sam_${ts}@test.com`,
      password: 'Password123!',
      role: 'USER',
    });
    user2Token = resU2.body.data.accessToken;
    user2Id = resU2.body.data.user.id || resU2.body.data.user._id;

    // Register Admin
    const resAdmin = await request(app).post('/api/v1/auth/register').send({
      name: 'Cinema Admin Sarah',
      email: `sarah_admin_${ts}@test.com`,
      password: 'AdminPassword123!',
      role: 'ADMIN',
    });
    adminToken = resAdmin.body.data.accessToken;

    // Create Test Movies
    const m1Res = await request(app)
      .post('/api/v1/movies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Interstellar Odyssey ${ts}`,
        synopsis: 'A cosmic journey exploring the depths of space and time.',
        genre: ['Sci-Fi', 'Adventure'],
        language: 'English',
        duration: 165,
        rating: 9.1,
        releaseDate: '2026-05-01',
        status: 'now_showing',
        posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401',
      });
    movie1Id = m1Res.body.data._id || m1Res.body.data.id;

    const m2Res = await request(app)
      .post('/api/v1/movies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `Neon Horizon ${ts}`,
        synopsis: 'Cyberpunk detectives unravel a high-tech corporate syndicate.',
        genre: ['Action', 'Thriller'],
        language: 'English',
        duration: 128,
        rating: 8.4,
        releaseDate: '2026-06-15',
        status: 'now_showing',
        posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5',
      });
    movie2Id = m2Res.body.data._id || m2Res.body.data.id;

    // Create Theatres with Explicit Accessibility Statuses
    const t1Res = await request(app)
      .post('/api/v1/theatres')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Accessible Grand Cinema ${ts}`,
        city: 'New York',
        address: { street: '400 Broadway', city: 'New York', state: 'NY', zipCode: '10013' },
        screens: [{ screenNumber: 1, name: 'Main Hall', capacity: 100 }],
        accessibility: {
          wheelchairAccess: 'VERIFIED',
          assistiveListening: 'VERIFIED',
          elevatorAccess: 'VERIFIED',
          accessibleParking: 'VERIFIED',
          accessibleRestrooms: 'VERIFIED',
        },
      });
    accessibleTheatreId = t1Res.body.data._id || t1Res.body.data.id;

    const t2Res = await request(app)
      .post('/api/v1/theatres')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Heritage Classic Cinema ${ts}`,
        city: 'New York',
        address: { street: '12 Historic Lane', city: 'New York', state: 'NY', zipCode: '10014' },
        screens: [{ screenNumber: 1, name: 'Screen 1', capacity: 80 }],
        accessibility: {
          wheelchairAccess: 'NOT_AVAILABLE',
          assistiveListening: 'NOT_AVAILABLE',
          elevatorAccess: 'NOT_AVAILABLE',
        },
      });
    regularTheatreId = t2Res.body.data._id || t2Res.body.data.id;

    // Create Shows with Screening Accessibility
    const s1Start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const s1End = new Date(s1Start.getTime() + 2.5 * 60 * 60 * 1000);
    const s1Res = await request(app)
      .post('/api/v1/shows')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        movie: movie1Id,
        theatre: accessibleTheatreId,
        screenNumber: 1,
        screenName: 'Main Hall',
        startTime: s1Start.toISOString(),
        endTime: s1End.toISOString(),
        pricing: [{ tier: 'Standard', price: 16.0 }],
        accessibility: {
          closedCaptioning: true,
          audioDescription: true,
          wheelchairAccessible: true,
        },
      });
    accessibleShowId = s1Res.body.data._id || s1Res.body.data.id;

    const s2Start = new Date(Date.now() + 25 * 60 * 60 * 1000);
    const s2End = new Date(s2Start.getTime() + 2.5 * 60 * 60 * 1000);
    const s2Res = await request(app)
      .post('/api/v1/shows')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        movie: movie2Id,
        theatre: regularTheatreId,
        screenNumber: 1,
        screenName: 'Screen 1',
        startTime: s2Start.toISOString(),
        endTime: s2End.toISOString(),
        pricing: [{ tier: 'Standard', price: 14.0 }],
        accessibility: {
          closedCaptioning: false,
          audioDescription: false,
          wheelchairAccessible: false,
        },
      });
    regularShowId = s2Res.body.data._id || s2Res.body.data.id;
  });

  // 1. SMARTMATCH RECOMMENDATIONS
  describe('1. SmartMatch Personalized Movie Recommendations', () => {
    it('updates user movie discovery taste profile preferences', async () => {
      const res = await request(app)
        .put('/api/v1/users/preferences')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          preferredGenres: ['Sci-Fi', 'Adventure'],
          preferredLanguages: ['English'],
          approximateBudget: 20,
          preferredShowTimes: ['EVENING', 'NIGHT'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.preferredGenres).toContain('Sci-Fi');
      expect(res.body.data.approximateBudget).toBe(20);
    });

    it('returns ranked recommendations with transparent match explanations', async () => {
      const res = await request(app)
        .get('/api/v1/movies/recommendations/smartmatch')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.recommendations)).toBe(true);
      expect(res.body.data.recommendations.length).toBeGreaterThan(0);

      // Verify structure of top recommendation
      const topRec = res.body.data.recommendations[0];
      expect(topRec.movie).toBeDefined();
      expect(typeof topRec.matchScore).toBe('number');
      expect(typeof topRec.matchPercentage).toBe('number');
      expect(Array.isArray(topRec.matchReasons)).toBe(true);
      expect(topRec.matchReasons.length).toBeGreaterThan(0);

      // Check transparent reason formatting
      const reasonsText = topRec.matchReasons.join(' ');
      expect(reasonsText).toMatch(/genre|rating|language|popular/i);
    });

    it('allows anonymous guests to receive general popular recommendations', async () => {
      const res = await request(app).get('/api/v1/movies/recommendations/smartmatch');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.recommendations)).toBe(true);
    });
  });

  // 2. PLAN MY MOVIE NIGHT (GROUP PLANNING)
  describe('2. Plan My Movie Night (Group Planning & Cost Sharing)', () => {
    let groupPlanId;
    let inviteToken;

    it('creates a group movie night plan with invite token', async () => {
      const res = await request(app)
        .post('/api/v1/group-plans')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Friday Night Sci-Fi Crew',
          city: 'New York',
          targetDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          budgetPerPerson: 25,
          candidateMovieIds: [movie1Id, movie2Id],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Friday Night Sci-Fi Crew');
      expect(res.body.data.inviteToken).toBeDefined();
      expect(res.body.data.members.length).toBe(1); // Organizer is initial member

      groupPlanId = res.body.data._id;
      inviteToken = res.body.data.inviteToken;
    });

    it('retrieves group plan details via shareable invite token', async () => {
      const res = await request(app).get(`/api/v1/group-plans/invite/${inviteToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Friday Night Sci-Fi Crew');
      expect(res.body.data.candidates.length).toBe(2);
    });

    it('allows a friend to join the group movie night using the invite token', async () => {
      const res = await request(app)
        .post(`/api/v1/group-plans/invite/${inviteToken}/join`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ displayName: 'Sam Partner' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.members.length).toBe(2);
    });

    it('records votes from group members and re-calculates candidate scores', async () => {
      const res = await request(app)
        .post(`/api/v1/group-plans/${groupPlanId}/vote`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          votes: [
            { movieId: movie1Id, voteScore: 3 }, // 1st choice
            { movieId: movie2Id, voteScore: 1 }, // 2nd choice
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const m1Candidate = res.body.data.candidates.find(
        (c) => String(c.movie._id || c.movie) === String(movie1Id)
      );
      expect(m1Candidate.totalVotes).toBeGreaterThanOrEqual(1);
    });

    it('finalizes group plan with selected movie and calculates per-person cost sharing', async () => {
      const res = await request(app)
        .post(`/api/v1/group-plans/${groupPlanId}/finalize`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          selectedMovieId: movie1Id,
          totalEstimatedCost: 50.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DECIDED');
      expect(res.body.data.costSharing.costPerPerson).toBe(25.0); // 50 / 2 members
    });
  });

  // 3. ACCESSIBLE CINEMA FINDER
  describe('3. Accessible Cinema Finder & Screening Filter', () => {
    it('filters theatres with verified step-free wheelchair access', async () => {
      const res = await request(app)
        .get('/api/v1/theatres?wheelchair=true')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Verify every returned theatre has verified wheelchair access
      res.body.data.forEach((th) => {
        const status = typeof th.accessibility?.wheelchairAccess === 'object'
          ? th.accessibility.wheelchairAccess.status
          : th.accessibility?.wheelchairAccess;
        const verified = Boolean(th.accessibility?.wheelchairAccessible || status === 'VERIFIED');
        expect(verified).toBe(true);
      });
    });

    it('filters shows with closed captioning accessibility', async () => {
      const res = await request(app)
        .get('/api/v1/shows?closedCaptions=true')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      res.body.data.forEach((show) => {
        const isCC = typeof show.accessibility?.closedCaptioning === 'object'
          ? show.accessibility.closedCaptioning.available
          : Boolean(show.accessibility?.closedCaptioning);
        expect(isCC).toBe(true);
      });
    });
  });

  // 4. FOOD & CONCESSIONS PRE-ORDERING
  describe('4. Food & Concessions Pre-Ordering Workflow', () => {
    let popcornItemId;
    let sodaItemId;
    let testOrderId;

    it('allows admin to manage concessions catalog', async () => {
      const popRes = await request(app)
        .post('/api/v1/food/items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Jumbo Butter Popcorn',
          category: 'Snacks',
          price: 9.5,
          calories: 620,
          isVegetarian: true,
          imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f',
        });

      expect(popRes.status).toBe(201);
      popcornItemId = popRes.body.data._id;

      const sodaRes = await request(app)
        .post('/api/v1/food/items')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Craft Cola Large',
          category: 'Beverages',
          price: 5.0,
          calories: 210,
          isVegan: true,
          imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97',
        });

      expect(sodaRes.status).toBe(201);
      sodaItemId = sodaRes.body.data._id;
    });

    it('retrieves active food items catalog', async () => {
      const res = await request(app).get('/api/v1/food/items');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((item) => item.name === 'Jumbo Butter Popcorn')).toBe(true);
    });

    it('places food order with server-verified prices snapshot (no client tampering)', async () => {
      const res = await request(app)
        .post('/api/v1/food/orders')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          items: [
            { foodItemId: popcornItemId, quantity: 2 }, // 2 * 9.50 = 19.00
            { foodItemId: sodaItemId, quantity: 1 },    // 1 * 5.00 = 5.00
          ],
          notes: 'Extra napkins please',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.subtotal).toBe(24.0);
      expect(res.body.data.totalAmount).toBeGreaterThan(24.0); // Includes tax
      expect(res.body.data.status).toBe('CONFIRMED');
      expect(res.body.data.pickupCounter).toBeDefined();

      testOrderId = res.body.data._id;
    });

    it('progresses food order status through preparation and ready for pickup lifecycle', async () => {
      // Transition to PREPARING
      const prepRes = await request(app)
        .patch(`/api/v1/food/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PREPARING' });

      expect(prepRes.status).toBe(200);
      expect(prepRes.body.data.status).toBe('PREPARING');

      // Transition to READY_FOR_PICKUP
      const readyRes = await request(app)
        .patch(`/api/v1/food/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'READY_FOR_PICKUP', pickupCounter: 'Express Counter 2' });

      expect(readyRes.status).toBe(200);
      expect(readyRes.body.data.status).toBe('READY_FOR_PICKUP');
      expect(readyRes.body.data.pickupCounter).toBe('Express Counter 2');

      // Transition to COLLECTED
      const collectRes = await request(app)
        .patch(`/api/v1/food/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'COLLECTED' });

      expect(collectRes.status).toBe(200);
      expect(collectRes.body.data.status).toBe('COLLECTED');
    });
  });

  // 5. CINEMA INTELLIGENCE ANALYTICS DASHBOARD
  describe('5. Cinema Intelligence Analytics Dashboard', () => {
    it('aggregates real financial and occupancy metrics for admin dashboard', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics?range=all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { kpis, topMovies, occupancy, dailyTrends } = res.body.data;

      // Verify Financial and Sales KPIs
      expect(kpis).toBeDefined();
      expect(typeof kpis.grossTicketSales).toBe('number');
      expect(typeof kpis.collectedRevenue).toBe('number');
      expect(typeof kpis.refundedAmount).toBe('number');
      expect(typeof kpis.paidBookingsCount).toBe('number');
      expect(typeof kpis.occupancyRate).toBe('number');

      // Verify Top Performing Titles
      expect(Array.isArray(topMovies)).toBe(true);

      // Verify Occupancy Details
      expect(occupancy).toBeDefined();
      expect(typeof occupancy.totalCapacity).toBe('number');
      expect(typeof occupancy.occupiedSeats).toBe('number');

      // Verify Daily Trends Breakdown
      expect(Array.isArray(dailyTrends)).toBe(true);
    });

    it('denies access to non-admin users attempting to view intelligence analytics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/analytics')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
