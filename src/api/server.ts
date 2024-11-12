import express from 'express';
import restaurantRoutes from './routes/restaurant.routes';
import adminRoutes from './routes/admin.routes';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/restaurants', restaurantRoutes);
app.use('/api/admin', adminRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});