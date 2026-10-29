import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createServiceRequest, listServiceRequests } from '../controllers/serviceController.js';

const router = Router();
router.use(authenticate);
router.get('/', listServiceRequests);
router.post('/', authorize('guest'), [
  body('category').isIn(['housekeeping', 'maintenance', 'room_service', 'concierge', 'other']),
  body('message').trim().isLength({ min: 3, max: 1200 }),
  body('bookingId').optional().isMongoId(), body('roomId').optional().isMongoId(),
  body('priority').optional().isIn(['normal', 'high']),
], validate, createServiceRequest);
export default router;
