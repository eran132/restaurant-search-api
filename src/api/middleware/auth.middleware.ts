import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define the structure of your JWT payload
interface JWTPayload {
    role: string;
    iat?: number;    // Issued at timestamp
    exp?: number;    // Expiration timestamp
}

// Error handler type
type ErrorResponse = {
    error: string;
    details?: string;
};

/**
 * Middleware to authenticate JWT tokens
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 * @returns void | Response with error
 */
export const authMiddleware = (
    req: Request,
    res: Response<ErrorResponse>,
    next: NextFunction
): void | Response<ErrorResponse> => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') 
            ? authHeader.split(' ')[1] 
            : null;

        // Check if token exists
        if (!token) {
            return res.status(401).json({ 
                error: 'Authorization Required',
                details: 'No token provided'
            });
        }

        try {
            // Verify and decode the token
            const decoded = jwt.verify(
                token, 
                process.env.JWT_SECRET || 'secret'
            ) as JWTPayload;

            // Add decoded user to request object
            req.user = decoded;
            
            next();
        } catch (error) {
            // Handle different types of JWT errors
            if (error instanceof jwt.TokenExpiredError) {
                return res.status(401).json({
                    error: 'Token Expired',
                    details: 'Please login again'
                });
            }
            
            if (error instanceof jwt.JsonWebTokenError) {
                return res.status(401).json({
                    error: 'Invalid Token',
                    details: 'Token validation failed'
                });
            }

            // Handle any other token-related errors
            return res.status(401).json({
                error: 'Authentication Failed',
                details: 'Token verification failed'
            });
        }
    } catch (error) {
        // Handle any unexpected errors
        console.error('Auth Middleware Error:', error);
        return res.status(500).json({
            error: 'Internal Server Error',
            details: 'An unexpected error occurred'
        });
    }
};

// Export the JWTPayload type for use in other files
export type { JWTPayload };