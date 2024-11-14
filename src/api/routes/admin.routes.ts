import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';
import pool from '../../db/connection';
import { ParsedQs } from 'qs';
import type { JWTPayload } from '../middleware/auth.middleware';

interface AdminQuery extends ParsedQs {
    page?: string;
    limit?: string;
    search?: string;
}

interface AdminRequestBody {
    name?: string;
    role?: string;
    permissions?: string[];
    password?: string;
    cuisine_type?: string;
    is_kosher?: boolean;
    address?: string;
    phone?: string;
    website?: string;
    opening_hours?: Record<string, { open: string; close: string }>;
}

interface AdminRequest extends Request {
    query: AdminQuery;
    body: AdminRequestBody;
    params: Record<string, string>;
}

const router = express.Router();

// Login endpoint - unprotected
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { password } = req.body;

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const payload: JWTPayload = {
            role: 'admin'
        };

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            data: { token }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// Protected routes
router.use(authMiddleware);
router.use(auditMiddleware);

// Get all restaurants with pagination
router.get('/restaurants', async (req: AdminRequest, res: Response) => {
    try {
        const { page = '1', limit = '50' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        
        // Get total count
        const countResult = await pool.query('SELECT COUNT(*) FROM restaurants');
        const total = parseInt(countResult.rows[0].count);
        
        const query = `
            SELECT id, name, address, phone, website, opening_hours, 
                   cuisine_type, is_kosher, created_at, updated_at
            FROM restaurants
            ORDER BY id ASC
            LIMIT $1 OFFSET $2
        `;
        
        const result = await pool.query(query, [Number(limit), offset]);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// Get single restaurant
router.get('/restaurants/:id', async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT id, name, address, phone, website, opening_hours, 
                   cuisine_type, is_kosher, created_at, updated_at
            FROM restaurants
            WHERE id = $1
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// Create restaurant
router.post('/restaurants', async (req: AdminRequest, res: Response) => {
    try {
        const { 
            name, cuisine_type, is_kosher, address, 
            phone, website, opening_hours 
        } = req.body;
        
        const query = `
            INSERT INTO restaurants (
                name, cuisine_type, is_kosher, address, 
                phone, website, opening_hours
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            name, cuisine_type, is_kosher, address,
            phone, website, opening_hours ? JSON.stringify(opening_hours) : null
        ]);
        
        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// Update restaurant
router.put('/restaurants/:id', async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { 
            name, cuisine_type, is_kosher, address,
            phone, website, opening_hours 
        } = req.body;
        
        const query = `
            UPDATE restaurants
            SET name = $1, cuisine_type = $2, is_kosher = $3, address = $4,
                phone = $5, website = $6, opening_hours = $7,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            name, cuisine_type, is_kosher, address,
            phone, website, opening_hours ? JSON.stringify(opening_hours) : null,
            id
        ]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// Delete restaurant
router.delete('/restaurants/:id', async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params;
        
        const query = 'DELETE FROM restaurants WHERE id = $1';
        const result = await pool.query(query, [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Restaurant deleted successfully'
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

export default router;