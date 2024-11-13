import express, { Request, Response } from 'express';
import { Pool, QueryResult } from 'pg';
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
}

interface AdminRequest extends Request {
    query: AdminQuery;
    body: AdminRequestBody;
}

interface AdminResponse {
    success: boolean;
    data: Record<string, unknown>;
    message?: string;
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

router.get('/restaurants', async (req: AdminRequest, res: Response) => {
    try {
        const { page = '1', limit = '10' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        
        const query = `
            SELECT * FROM restaurants
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `;
        
        const result = await pool.query(query, [Number(limit), offset]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

router.post('/restaurants', async (req: AdminRequest, res: Response) => {
    try {
        const { name, cuisine_type, is_kosher, address } = req.body;
        
        const query = `
            INSERT INTO restaurants (name, cuisine_type, is_kosher, address)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        
        const result = await pool.query(query, [name, cuisine_type, is_kosher, address]);
        
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

router.put('/restaurants/:id', async (req: AdminRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, cuisine_type, is_kosher, address } = req.body;
        
        const query = `
            UPDATE restaurants
            SET name = $1, cuisine_type = $2, is_kosher = $3, address = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `;
        
        const result = await pool.query(query, [name, cuisine_type, is_kosher, address, id]);
        
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