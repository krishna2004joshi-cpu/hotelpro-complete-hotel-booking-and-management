import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { register, verifyEmail, login, me, logout, forgotPassword, resetPassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: { message: 'Too many attempts. Please try again in a few minutes.' } } });
const strongPassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,128}$/.test(value);

router.post('/register', authLimiter, body('name').trim().isLength({ min: 2, max: 100 }), body('email').trim().isEmail().normalizeEmail(), body('password').custom(strongPassword).withMessage('Use 10+ characters with upper and lower case, a number, and a symbol.'), validate, register);
router.post('/verify-email', authLimiter, body('token').isHexadecimal().isLength({ min: 64, max: 64 }), validate, verifyEmail);
router.post('/login', authLimiter, body('email').trim().isEmail().normalizeEmail(), body('password').isLength({ min: 1, max: 128 }), validate, login);
router.post('/forgot-password', authLimiter, body('email').trim().isEmail().normalizeEmail(), validate, forgotPassword);
router.post('/reset-password', authLimiter, body('token').isHexadecimal().isLength({ min: 64, max: 64 }), body('password').custom(strongPassword).withMessage('Use 10+ characters with upper and lower case, a number, and a symbol.'), validate, resetPassword);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);

export default router;
