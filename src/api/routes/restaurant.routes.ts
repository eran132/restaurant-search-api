import express, { Request, Response } from 'express';
import { Pool, QueryResult } from 'pg';
import { auditMiddleware } from '../middleware/audit.middleware';
import pool from '../../db/connection';
import { ParsedQs } from 'qs';

interface RestaurantQuery extends ParsedQs {
    cuisine_type?: string;
    isKosher?: string; // Changed from boolean to string
    page?: string;
    limit?: string;
}

interface Restaurant {
    id: number;
    name: string;
    address: string;
    cuisine_type: string;
    is_kosher: boolean;
}

interface RestaurantRequest extends Request {
    query: RestaurantQuery;
}

const router = express.Router();

router.get('/search', auditMiddleware, async (req: RestaurantRequest, res: Response) => {
    const { cuisine_type, isKosher, page = '1', limit = '10' } = req.query;
    
    try {
        const offset = (Number(page) - 1) * Number(limit);
        const query = `
            SELECT * FROM restaurants 
            WHERE ($1::text IS NULL OR cuisine_type = $1)
            AND ($2::boolean IS NULL OR is_kosher = $2)
            LIMIT $3 OFFSET $4
        `;
        
        const result: QueryResult<Restaurant> = await pool.query(query, [
            cuisine_type || null,
            isKosher ? isKosher.toLowerCase() === 'true' : null, // Convert string to boolean
            Number(limit),
            offset
        ]);
        
        res.json(result.rows);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        res.status(500).json({ error: errorMessage });
    }
});

export default router;