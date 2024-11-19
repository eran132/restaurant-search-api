import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { pool } from '../db/connection';
import restaurantRouter from './routes/restaurant.routes';
import adminRouter from './routes/admin.routes';
import { Server } from 'http';
import AWS from 'aws-sdk';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import serverless from 'serverless-http';

dotenv.config();

const app = express();
let server: Server | null = null;
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

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

// Middleware for authentication
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'secret');
        next();
    } catch (error) {
        res.status(401).json({ message: 'Unauthorized' });
    }
};

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

// Load restaurants from S3 and populate DynamoDB
app.post('/load-restaurants', async (req: Request, res: Response) => {
    try {
        const params = {
            Bucket: 'restaurant-data',
            Key: 'restaurants.json',
        };
        const data = await s3.getObject(params).promise();
        const restaurants = JSON.parse(data.Body.toString());

        for (const restaurant of restaurants) {
            const putParams = {
                TableName: 'Restaurants',
                Item: {
                    RestaurantID: uuidv4(),
                    ...restaurant,
                },
            };
            await dynamoDb.put(putParams).promise();
        }

        res.json({ message: 'Restaurants loaded successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load restaurants', error });
    }
});

// Search restaurants by cuisine, kosher, and currently open
app.get('/restaurants/search', async (req: Request, res: Response) => {
    const { cuisine, isKosher, currentlyOpen } = req.query;

    // Query logic here
    // ...

    res.json({ message: 'Search functionality not implemented yet' });
});

// Admin routes
app.use('/admin', authMiddleware);

// Add a restaurant
app.post('/admin/restaurants', async (req: Request, res: Response) => {
    const restaurant = req.body;
    const params = {
        TableName: 'Restaurants',
        Item: {
            RestaurantID: uuidv4(),
            ...restaurant,
        },
    };
    await dynamoDb.put(params).promise();
    res.json({ message: 'Restaurant added successfully' });
});

// Edit a restaurant
app.put('/admin/restaurants/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const restaurant = req.body;
    const params = {
        TableName: 'Restaurants',
        Key: { RestaurantID: id },
        UpdateExpression: 'set #name = :name, #address = :address, #cuisine_type = :cuisine_type, #is_kosher = :is_kosher, #opening_hours = :opening_hours',
        ExpressionAttributeNames: {
            '#name': 'name',
            '#address': 'address',
            '#cuisine_type': 'cuisine_type',
            '#is_kosher': 'is_kosher',
            '#opening_hours': 'opening_hours',
        },
        ExpressionAttributeValues: {
            ':name': restaurant.name,
            ':address': restaurant.address,
            ':cuisine_type': restaurant.cuisine_type,
            ':is_kosher': restaurant.is_kosher,
            ':opening_hours': restaurant.opening_hours,
        },
    };
    await dynamoDb.update(params).promise();
    res.json({ message: 'Restaurant updated successfully' });
});

// Delete a restaurant
app.delete('/admin/restaurants/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const params = {
        TableName: 'Restaurants',
        Key: { RestaurantID: id },
    };
    await dynamoDb.delete(params).promise();
    res.json({ message: 'Restaurant deleted successfully' });
});

// Audit logs
app.get('/admin/audit-logs', async (req: Request, res: Response) => {
    // Query audit logs from DynamoDB
    // ...

    res.json({ message: 'Audit logs functionality not implemented yet' });
});

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

module.exports.handler = serverless(app);

export { app, server };