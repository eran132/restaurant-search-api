import express from 'express';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import pool from '../../db/connection';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Admin login
router.post('/login', async (req: Request, res: Response) => {
    const { password } = req.body;
    
    // Check against environment variable
    if (password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign(
            { role: 'admin' }, 
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );
        res.json({ token });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Get all restaurants (for admin view)
router.get('/restaurants', authMiddleware, async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT * FROM restaurants ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching restaurants:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add new restaurant
router.post('/restaurants', authMiddleware, async (req: Request, res: Response) => {
    try {
        const {
            name,
            address,
            phone,
            website,
            opening_hours,
            cuisine_type,
            is_kosher
        } = req.body;

        const result = await pool.query(
            `INSERT INTO restaurants 
            (name, address, phone, website, opening_hours, cuisine_type, is_kosher) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *`,
            [name, address, phone, website, opening_hours, cuisine_type, is_kosher]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error adding restaurant:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update restaurant
router.put('/restaurants/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            name,
            address,
            phone,
            website,
            opening_hours,
            cuisine_type,
            is_kosher
        } = req.body;

        const result = await pool.query(
            `UPDATE restaurants 
            SET name = $1, 
                address = $2, 
                phone = $3, 
                website = $4, 
                opening_hours = $5, 
                cuisine_type = $6, 
                is_kosher = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8 
            RETURNING *`,
            [name, address, phone, website, opening_hours, cuisine_type, is_kosher, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating restaurant:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete restaurant
router.delete('/restaurants/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM restaurants WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        res.json({ message: 'Restaurant deleted successfully' });
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get audit logs (last 24 hours)
router.get('/audit-logs', authMiddleware, async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`
            SELECT 
                endpoint,
                method,
                query_params,
                ip_address,
                country,
                timestamp
            FROM audit_logs 
            WHERE timestamp >= NOW() - INTERVAL '1 day'
            ORDER BY timestamp DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export const adminRouter = router;