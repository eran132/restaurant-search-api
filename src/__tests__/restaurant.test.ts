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
                    is_kosher BOOLEAN DEFAULT false
                );

                INSERT INTO restaurants (name, address, cuisine_type, is_kosher)
                VALUES 
                    ('Kosher Italian', 'Test Address 2', 'Italian', true),
                    ('Test Italian', 'Test Address 1', 'Italian', false);
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
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0].name).toBe('Kosher Italian');
        });

        it('should handle pagination', async () => {
            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ page: '1', limit: '1' });

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(1);
        });
    });
});