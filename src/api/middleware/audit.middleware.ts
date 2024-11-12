import { Request, Response, NextFunction } from 'express';
import pool from '../../db/connection';

export const auditMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { ip } = req;
        const country = 'Unknown'; // You can integrate with a geolocation service
        
        await pool.query(
            `INSERT INTO audit_logs (endpoint, method, query_params, ip_address, country)
             VALUES ($1, $2, $3, $4, $5)`,
            [req.path, req.method, JSON.stringify(req.query), ip, country]
        );
        
        next();
    } catch (error) {
        console.error('Error in audit middleware:', error);
        next();
    }
};