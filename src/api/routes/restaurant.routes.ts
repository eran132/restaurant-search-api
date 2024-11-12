import { Router } from 'express';
import { RestaurantController } from '../controllers/restaurant.controller';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();
const controller = new RestaurantController();

router.get('/search', auditMiddleware, controller.searchRestaurants);
router.get('/open', auditMiddleware, controller.getOpenRestaurants);
router.get('/:id', auditMiddleware, controller.getRestaurantById);

export default router;