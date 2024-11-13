// src/api/routes/restaurant.routes.ts
import express from 'express';
import { auditMiddleware } from '../middleware/audit.middleware';
import pool from '../../db/connection';

const router = express.Router();

// Search restaurants by cuisine and kosher status
router.get('/search', auditMiddleware, async (req, res) => {
    const { cuisine, isKosher } = req.query;
    try {
        const query = `
            SELECT * FROM restaurants 
            WHERE ($1::text IS NULL OR cuisine_type = $1)
            AND ($2::boolean IS NULL OR is_kosher = $2)
        `;
        const result = await pool.query(query, [cuisine || null, isKosher === 'true']);
        if (!result) {
            console.error('No result from query');
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(result.rows || []);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Get currently open restaurants
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
        if (!result) {
            console.error('No result from query');
            return res.status(500).json({ error: 'Database query failed' });
        }
        res.json(result.rows || []);
    } catch (error) {
        console.error('Open restaurants error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

export const restaurantRouter = router;