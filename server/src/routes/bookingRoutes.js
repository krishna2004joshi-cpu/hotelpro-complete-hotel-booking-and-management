import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createBooking, getBooking, invoice, listBookings, markCheckedIn, markCheckedOut, requestCancellation } from '../controllers/bookingController.js';

const router = Router();
router.use(authenticate);
router.get('/', listBookings);
router.post('/', authorize('guest'), [
  body('roomId').isMongoId(), body('checkIn').isISO8601({ strict: true }), body('checkOut').isISO8601({ strict: true }),
  body('guestsCount').isInt({ min: 1, max: 12 }), body('specialRequest').optional().trim().isLength({ max: 1000 }),
], validate, createBooking);
router.get('/:id', param('id').isMongoId(), validate, getBooking);
router.get('/:id/invoice', param('id').isMongoId(), validate, invoice);
router.post('/:id/cancel', authorize('guest'), param('id').isMongoId(), body('reason').optional().trim().isLength({ max: 500 }), validate, requestCancellation);
router.post('/:id/check-in', authorize('staff'), param('id').isMongoId(), validate, markCheckedIn);
router.post('/:id/check-out', authorize('staff'), param('id').isMongoId(), validate, markCheckedOut);
export default router;
