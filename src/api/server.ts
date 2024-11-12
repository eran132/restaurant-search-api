import express from 'express';
import { restaurantRouter } from './routes/restaurant.routes';
import { adminRouter } from './routes/admin.routes';

const app = express();

app.use(express.json());

// Routes
app.use('/api/restaurants', restaurantRouter);
app.use('/admin', adminRouter);

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

export default app;