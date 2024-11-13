// src/api/middleware/audit.middleware.ts
import { Request, Response, NextFunction } from 'express';
import pool from '../../db/connection';

export const auditMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        await pool.query(
            `INSERT INTO audit_logs (endpoint, method, query_params, ip_address, country)
             VALUES ($1, $2, $3, $4, $5)`,
            [req.path, req.method, JSON.stringify(req.query), req.ip, 'Unknown']
        );
    } catch (error) {
        console.error('Audit log error:', error);
    } finally {
        next(); // Always continue to next middleware/route handler
    }
};