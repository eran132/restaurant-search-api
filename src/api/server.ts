import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import restaurantRouter from './routes/restaurant.routes';
import adminRouter from './routes/admin.routes';
import { Server } from 'http';

dotenv.config();

const app = express();
let server: Server | null = null;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure public directory exists
const publicPath = path.join(__dirname, '../../public');
if (!require('fs').existsSync(publicPath)) {
    console.warn('Public directory not found, creating...');
    require('fs').mkdirSync(publicPath, { recursive: true });
}

// Static file serving with caching
app.use(express.static(publicPath, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// CORS headers
app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

// Security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Update CSP to allow inline scripts and styles
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    );
    next();
});

// Request logging with route info
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} ${req.ip}`);
    next();
});

// Root route with API documentation
app.get('/', (_req: Request, res: Response) => {
    res.json({
        message: 'Welcome to Restaurant Search API',
        endpoints: {
            public: {
                search: 'GET /api/restaurants/search?cuisine=<cuisine>&isKosher=<true|false>',
                openNow: 'GET /api/restaurants/open'
            },
            admin: {
                login: 'POST /admin/login',
                getAllRestaurants: 'GET /admin/restaurants',
                addRestaurant: 'POST /admin/restaurants',
                updateRestaurant: 'PUT /admin/restaurants/:id',
                deleteRestaurant: 'DELETE /admin/restaurants/:id',
                auditLogs: 'GET /admin/audit-logs'
            }
        },
        examples: {
            search: 'http://localhost:3000/api/restaurants/search?cuisine=Italian',
            openNow: 'http://localhost:3000/api/restaurants/open',
            login: {
                endpoint: 'http://localhost:3000/admin/login',
                body: {
                    password: "your-admin-password"
                }
            }
        }
    });
});

// API routes
app.use('/api/restaurants', restaurantRouter);
app.use('/admin', adminRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
    next();
});

// Handle 404
app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
});

// Only start the server if we're not in test mode
if (process.env.NODE_ENV !== 'test') {
    const port = process.env.PORT || 3000;
    server = app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Admin interface at http://localhost:${port}/admin/login.html`);
    });
}

export { app, server };