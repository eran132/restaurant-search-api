// src/__tests__/restaurant.test.ts
import request from 'supertest';
import { app } from '../api/server';
import _pool from '../db/connection';

describe('Restaurant API', () => {
  beforeAll(async () => {
    // Clean up and recreate tables
    await _pool.query('DROP TABLE IF EXISTS restaurants');
    
    await _pool.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        cuisine_type VARCHAR(100),
        is_kosher BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Insert test data in specific order
      INSERT INTO restaurants (name, address, cuisine_type, is_kosher)
      VALUES 
        ('Kosher Italian', 'Test Address 2', 'Italian', true),
        ('Test Italian', 'Test Address 1', 'Italian', false);
    `);
  });

  afterAll(async () => {
    await _pool.query('DROP TABLE IF EXISTS restaurants');
    await _pool.end();
  });

  describe('GET /api/restaurants/search', () => {
    it('should return filtered restaurants', async () => {
      const response = await request(app)
        .get('/api/restaurants/search')
        .query({ cuisine_type: 'Italian', isKosher: true }); // Match route parameter name

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].name).toBe('Kosher Italian');
    });

    it('should handle pagination', async () => {
      const response = await request(app)
        .get('/api/restaurants/search')
        .query({ page: 1, limit: 1 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });
  });
});