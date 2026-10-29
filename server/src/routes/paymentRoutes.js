import { Router } from 'express';
import { param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { completeDemoPayment, createCheckout, listPayments, requestRefund, stripeWebhook } from '../controllers/paymentController.js';

const router = Router();
router.post('/webhook', stripeWebhook);
router.use(authenticate);
router.get('/', authorize('guest', 'staff', 'admin'), listPayments);
router.post('/checkout/:bookingId', authorize('guest'), param('bookingId').isMongoId(), validate, createCheckout);
router.post('/demo/:paymentId/complete', authorize('guest'), param('paymentId').isMongoId(), validate, completeDemoPayment);
router.post('/:paymentId/refund', authorize('guest', 'staff', 'admin'), param('paymentId').isMongoId(), validate, requestRefund);
export default router;
