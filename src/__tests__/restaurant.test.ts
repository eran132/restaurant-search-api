// src/__tests__/restaurant.test.ts
import request from 'supertest';
import { app, server } from '../api/server';
import { Pool } from 'pg';
import { testConfig } from '../db/connection';

// Global setup
const globalSetup = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
};

// Global teardown
const globalTeardown = async () => {
    if (server) {
        await new Promise(resolve => server.close(resolve));
    }
};

jest.setTimeout(30000);

describe('Restaurant API', () => {
    let testPool: Pool;

    beforeAll(async () => {
        await globalSetup();
        testPool = new Pool(testConfig);

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
    });

    afterAll(async () => {
        try {
            // Close all connections first
            await testPool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1', 
                ['restaurants_test']);
            
            // Drop test tables
            await testPool.query('DROP TABLE IF EXISTS restaurants');
            
            // End pool
            await new Promise<void>((resolve) => {
                testPool.end(() => {
                    if (server) {
                        server.close(() => resolve());
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('Test cleanup failed:', error);
        }
        await globalTeardown();
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