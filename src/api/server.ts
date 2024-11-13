import express from 'express';
import { restaurantRouter } from './routes/restaurant.routes';
import { adminRouter } from './routes/admin.routes';
import { Server } from 'http';

const app = express();
let server: Server | null = null;

app.use(express.json());

// Root route with API documentation
app.get('/', (req, res) => {
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

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

// Only start the server if we're not in test mode
if (process.env.NODE_ENV !== 'test') {
    const port = process.env.PORT || 3000;
    server = app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

export { app, server };