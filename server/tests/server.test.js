const request = require('supertest');
const app = require('../src/app');

describe('IMovies API - Foundation & Health Tests', () => {
  describe('GET /api/health', () => {
    it('should return 200 OK with healthy status payload', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('service', 'IMovies REST API');
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('database');
    });

    it('should return 200 OK on versioned health endpoint /api/v1/health', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('GET /api/v1/movies', () => {
    it('should return 200 OK with movie catalogue list and metadata', async () => {
      const response = await request(app).get('/api/v1/movies');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta.availableGenres).toContain('Sci-Fi');
    });

    it('should filter movies by genre accurately', async () => {
      const response = await request(app).get('/api/v1/movies?genre=Sci-Fi');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((movie) => {
        expect(movie.genre).toContain('Sci-Fi');
      });
    });

    it('should return 404 for a non-existent movie ID', async () => {
      const response = await request(app).get('/api/v1/movies/invalid-id-99999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/not found/i);
    });
  });

  describe('Route Not Found & Error Handling', () => {
    it('should return 404 with structured JSON for unrecognized routes', async () => {
      const response = await request(app).get('/api/v1/non-existent-route-xyz');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Route not found');
    });
  });
});
