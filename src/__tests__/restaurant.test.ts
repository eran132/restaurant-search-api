// src/__tests__/restaurant.test.ts
import { jest } from '@jest/globals';
import request from 'supertest';

// Mock query with proper error handling
const mockQuery = jest.fn();

// Mock the modules
jest.mock('pg', () => ({
    Pool: jest.fn(() => ({
        query: mockQuery
    }))
}));

jest.mock('../db/connection', () => ({
    __esModule: true,
    default: {
        query: mockQuery
    }
}));

// Import app and server after mocks
import { app, server } from '../api/server';

describe('Restaurant API Tests', () => {
    beforeEach(() => {
        mockQuery.mockReset();
        // Default mock for audit log query
        mockQuery.mockImplementation(() => Promise.resolve({ rows: [] }));
    });

    describe('GET /api/restaurants/search', () => {
        it('should search restaurants by cuisine', async () => {
            const mockRestaurants = [{
                id: 1,
                name: 'Test Restaurant',
                cuisine_type: 'Italian',
                is_kosher: true
            }];

            mockQuery
                .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
                .mockImplementationOnce(() => Promise.resolve({ rows: mockRestaurants }));

            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ cuisine: 'Italian' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockRestaurants);
            expect(mockQuery).toHaveBeenCalledTimes(2);
        });

        it('should handle empty results', async () => {
            mockQuery
                .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
                .mockImplementationOnce(() => Promise.resolve({ rows: [] }));

            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ cuisine: 'Unknown' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('should handle invalid query parameters', async () => {
            mockQuery
                .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
                .mockImplementationOnce(() => Promise.resolve({ rows: [] }));

            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ cuisine: '', isKosher: 'invalid' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe('GET /api/restaurants/open', () => {
        it('should return currently open restaurants', async () => {
            const mockRestaurants = [{
                id: 1,
                name: 'Test Restaurant',
                opening_hours: {
                    monday: { open: "09:00", close: "22:00" }
                }
            }];

            mockQuery
                .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
                .mockImplementationOnce(() => Promise.resolve({ rows: mockRestaurants }));

            const response = await request(app)
                .get('/api/restaurants/open');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockRestaurants);
            expect(mockQuery).toHaveBeenCalledTimes(2);
        });

        it('should handle no open restaurants', async () => {
            mockQuery
                .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
                .mockImplementationOnce(() => Promise.resolve({ rows: [] }));

            const response = await request(app)
                .get('/api/restaurants/open');

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });
    });

    describe('Audit Middleware', () => {
        it('should not block request if audit logging fails', async () => {
            const mockRestaurants = [{
                id: 1,
                name: 'Test Restaurant',
                cuisine_type: 'Italian',
                is_kosher: true
            }];

            mockQuery
                .mockImplementationOnce(() => Promise.reject(new Error('Audit log error')))
                .mockImplementationOnce(() => Promise.resolve({ rows: mockRestaurants }));

            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ cuisine: 'Italian' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockRestaurants);
        });
    });

    describe('Error Handling', () => {
        it('should handle database query errors', async () => {
            mockQuery
                .mockImplementationOnce(() => Promise.resolve({ rows: [] }))
                .mockImplementationOnce(() => Promise.reject(new Error('Database error')));

            const response = await request(app)
                .get('/api/restaurants/search')
                .query({ cuisine: 'Italian' });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });

        it('should return 404 for invalid routes', async () => {
            const response = await request(app)
                .get('/api/restaurants/invalid');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
        });
    });
});

// Cleanup after all tests
afterAll(done => {
    if (server) {
        server.close(done);
    } else {
        done();
    }
});