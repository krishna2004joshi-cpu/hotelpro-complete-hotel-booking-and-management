import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, optionalAuthenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createRoom, getRoom, listRooms, occupancy, updateRoom } from '../controllers/roomController.js';

const router = Router();
router.get('/', optionalAuthenticate, listRooms);
router.get('/occupancy', authenticate, authorize('staff', 'admin'), occupancy);
router.get('/:id', optionalAuthenticate, param('id').isMongoId(), validate, getRoom);
router.post('/', authenticate, authorize('staff', 'admin'), [
  body('hotel').optional().isMongoId(), body('name').trim().isLength({ min: 2, max: 120 }),
  body('code').trim().isLength({ min: 1, max: 20 }), body('category').isIn(['classic', 'deluxe', 'suite', 'family']),
  body('baseRate').isFloat({ min: 0 }), body('maxGuests').optional().isInt({ min: 1, max: 12 }),
  body('description').optional().trim().isLength({ max: 2000 }), body('amenities').optional().isArray(),
], validate, createRoom);
router.patch('/:id', authenticate, authorize('staff', 'admin'), param('id').isMongoId(), validate, updateRoom);
export default router;
