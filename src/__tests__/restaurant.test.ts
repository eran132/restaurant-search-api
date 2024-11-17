// src/__tests__/restaurant.test.ts
import request from 'supertest';
import { app } from '../api/server';
import { Pool } from 'pg';
import { testConfig } from '../db/connection';

describe('Restaurant API', () => {
    let testPool: Pool;

    beforeAll(async () => {
        try {
            testPool = new Pool(testConfig);

            // Clear existing data first
            await testPool.query('DROP TABLE IF EXISTS restaurants');
            
            await testPool.query(`
                CREATE TABLE IF NOT EXISTS restaurants (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    address TEXT NOT NULL,
                    cuisine_type VARCHAR(100),
                    is_kosher BOOLEAN DEFAULT false,
                    opening_hours JSONB
                );

                INSERT INTO restaurants (name, address, cuisine_type, is_kosher, opening_hours)
                VALUES 
                    ('Kosher Italian', 'Test Address 2', 'Italian', true, '{"monday": {"open": "09:00", "close": "17:00"}}'),
                    ('Test Italian', 'Test Address 1', 'Italian', false, '{"monday": {"open": "09:00", "close": "17:00"}}');
            `);
        } catch (error) {
            console.error('Test setup failed:', error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            if (testPool) {
                // Remove error listener to prevent unhandled errors
                testPool.removeAllListeners('error');
                
                // Drop tables
                await testPool.query('DROP TABLE IF EXISTS restaurants')
                    .catch(() => {}); // Ignore errors here
                
                // End pool with timeout
                await Promise.race([
                    testPool.end(),
                    new Promise(resolve => setTimeout(resolve, 1000))
                ]);
            }
        } catch (error) {
            console.error('Test cleanup error:', error);
        }
    });

    describe('GET /api/restaurants/search', () => {
        it('should return filtered restaurants', async () => {
            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ cuisine_type: 'Italian', isKosher: 'true' });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data[0].name).toBe('Kosher Italian');
        });

        it('should handle pagination', async () => {
            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ page: '1', limit: '1' });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data).toHaveLength(1);
        });

        it('should return filtered restaurants by cuisine', async () => {
            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ cuisine_type: 'Italian' });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data[0].cuisine_type).toBe('Italian');
        });

        it('should return filtered restaurants by kosher', async () => {
            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ isKosher: 'true' });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data[0].is_kosher).toBe(true);
        });

        it('should return currently open restaurants', async () => {
            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ currentlyOpen: 'true' });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            // Additional checks for opening hours can be added here
        });

        it('should return restaurants by name', async () => {
            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ name: 'Kosher Italian' });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data[0].name).toBe('Kosher Italian');
        });

        it('should return restaurants by address', async () => {
            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ address: 'Test Address 2' });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data[0].address).toBe('Test Address 2');
        });

        it('should return an empty array if no restaurants match the criteria', async () => {
            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ name: 'Nonexistent Restaurant' });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data).toHaveLength(0);
        });
    });
});