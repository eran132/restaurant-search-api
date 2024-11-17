import { Router, Request, Response } from 'express';
import { QueryResult } from 'pg';
import { pool } from '../../db/connection';
import { ParsedQs } from 'qs';

interface RestaurantQuery extends ParsedQs {
    cuisine_type?: string;
    isKosher?: string;
    page?: string;
    limit?: string;
    currentlyOpen?: string;
}

const router = Router();

router.get('/search', async (req: Request, res: Response) => {
    try {
        const { page, limit, cuisine_type, isKosher, currentlyOpen } = req.query as RestaurantQuery;

        // Your query logic here
        const result: QueryResult = await pool.query('SELECT * FROM restaurants WHERE ...');

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching restaurants:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default router;