import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { auditMiddleware } from '../middleware/audit.middleware';

const router = Router();
const controller = new AdminController();

router.post('/login', controller.login);
router.get('/audit-logs', authMiddleware, controller.getAuditLogs);
router.post('/restaurants', authMiddleware, controller.addRestaurant);
router.put('/restaurants/:id', authMiddleware, controller.updateRestaurant);
router.delete('/restaurants/:id', authMiddleware, controller.deleteRestaurant);

export default router;