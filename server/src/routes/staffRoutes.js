import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listServiceRequests, updateServiceRequest, createHousekeepingTask, listHousekeeping, updateHousekeeping } from '../controllers/serviceController.js';
import { listBookings } from '../controllers/bookingController.js';

const router = Router();
router.use(authenticate, authorize('staff', 'admin'));
router.get('/bookings', listBookings);
router.get('/service-requests', listServiceRequests);
router.patch('/service-requests/:id', [param('id').isMongoId(), body('status').optional().isIn(['open', 'in_progress', 'completed', 'cancelled']), body('assignedTo').optional().isMongoId()], validate, updateServiceRequest);
router.get('/housekeeping', listHousekeeping);
router.post('/housekeeping', [body('roomId').isMongoId(), body('type').optional().isIn(['turnover', 'refresh', 'deep_clean', 'inspection']), body('priority').optional().isIn(['normal', 'high']), body('dueAt').optional().isISO8601()], validate, createHousekeepingTask);
router.patch('/housekeeping/:id', [param('id').isMongoId(), body('status').optional().isIn(['queued', 'in_progress', 'completed']), body('assignedTo').optional().isMongoId()], validate, updateHousekeeping);
export default router;
