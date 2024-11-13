import express from 'express';
import { auditMiddleware } from '../middleware/audit.middleware';
import pool from '../../db/connection';

const router = express.Router();

router.get('/search', auditMiddleware, async (req, res) => {
    const { cuisine, isKosher } = req.query;
    try {
        const query = `
            SELECT * FROM restaurants 
            WHERE ($1::text IS NULL OR cuisine_type = $1)
            AND ($2::boolean IS NULL OR is_kosher = $2)
        `;
        const result = await pool.query(query, [cuisine, isKosher === 'true']);
        res.json(result.rows || []);
    } catch (error: any) { // Type assertion for error
        if (process.env.NODE_ENV !== 'test') {
            console.error('Search error:', error);
        }
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error?.message || 'Unknown error'
        });
    }
});

router.get('/open', auditMiddleware, async (req, res) => {
    try {
        const currentTime = new Date();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayOfWeek = days[currentTime.getDay()];
        const timeNow = currentTime.toTimeString().slice(0, 5);

        const query = `
            SELECT * FROM restaurants 
            WHERE opening_hours->$1->>'open' <= $2 
            AND opening_hours->$1->>'close' >= $2
        `;
        const result = await pool.query(query, [dayOfWeek, timeNow]);
        res.json(result.rows || []);
    } catch (error: any) { // Type assertion for error
        if (process.env.NODE_ENV !== 'test') {
            console.error('Open restaurants error:', error);
        }
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error?.message || 'Unknown error'
        });
    }
});

export const restaurantRouter = router;