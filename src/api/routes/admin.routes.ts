import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../../db/connection';
import { authMiddleware } from '../middleware/auth.middleware';

// Types
interface RestaurantInput {
    name: string;
    address: string;
    phone: string;
    website: string;
    opening_hours: {
        [key: string]: { 
            open: string; 
            close: string;
        }
    };
    cuisine_type: string;
    is_kosher: boolean;
}

interface ErrorResponse {
    error: string;
    details?: string;
}

interface SuccessResponse {
    message: string;
}

const router = express.Router();

// Admin login
router.post('/login', async (req: Request, res: Response<{ token: string } | ErrorResponse>) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ 
            error: 'Bad Request', 
            details: 'Password is required' 
        });
    }
    
    if (password === process.env.ADMIN_PASSWORD) {
        const token = jwt.sign(
            { role: 'admin' }, 
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );
        res.json({ token });
    } else {
        res.status(401).json({ 
            error: 'Invalid credentials',
            details: 'The provided password is incorrect'
        });
    }
});

// Get all restaurants (for admin view)
router.get('/restaurants', authMiddleware, async (req: Request, res: Response<RestaurantInput[] | ErrorResponse>) => {
    try {
        const result = await pool.query('SELECT * FROM restaurants ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching restaurants:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: 'Failed to fetch restaurants'
        });
    }
});

// Add new restaurant
router.post('/restaurants', authMiddleware, async (
    req: Request<{}, {}, RestaurantInput>, 
    res: Response<RestaurantInput | ErrorResponse>
) => {
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

        // Validation
        if (!name || !address) {
            return res.status(400).json({
                error: 'Bad Request',
                details: 'Name and address are required'
            });
        }

        // Validate opening hours format
        const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const hasValidOpeningHours = Object.keys(opening_hours).every(day => 
            validDays.includes(day) && 
            opening_hours[day].open && 
            opening_hours[day].close
        );

        if (!hasValidOpeningHours) {
            return res.status(400).json({
                error: 'Bad Request',
                details: 'Invalid opening hours format'
            });
        }

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
        res.status(500).json({ 
            error: 'Internal server error',
            details: 'Failed to add restaurant'
        });
    }
});

// Update restaurant
router.put('/restaurants/:id', authMiddleware, async (
    req: Request<{ id: string }, {}, RestaurantInput>,
    res: Response<RestaurantInput | ErrorResponse>
) => {
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

        // Validation
        if (!name || !address) {
            return res.status(400).json({
                error: 'Bad Request',
                details: 'Name and address are required'
            });
        }

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
            return res.status(404).json({ 
                error: 'Not Found',
                details: 'Restaurant not found'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating restaurant:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: 'Failed to update restaurant'
        });
    }
});

// Delete restaurant
router.delete('/restaurants/:id', authMiddleware, async (
    req: Request<{ id: string }>,
    res: Response<SuccessResponse | ErrorResponse>
) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM restaurants WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'Not Found',
                details: 'Restaurant not found'
            });
        }

        res.json({ message: 'Restaurant deleted successfully' });
    } catch (error) {
        console.error('Error deleting restaurant:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: 'Failed to delete restaurant'
        });
    }
});

// Get audit logs (last 24 hours)
router.get('/audit-logs', authMiddleware, async (
    req: Request,
    res: Response<Array<{
        endpoint: string;
        method: string;
        query_params: any;
        ip_address: string;
        country: string;
        timestamp: Date;
    }> | ErrorResponse>
) => {
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
        res.status(500).json({ 
            error: 'Internal server error',
            details: 'Failed to fetch audit logs'
        });
    }
});

export const adminRouter = router;