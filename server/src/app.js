import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import serviceRoutes from './routes/serviceRoutes.js';
import { authenticate, authorize } from './middleware/auth.js';
import { ApiError, errorHandler, notFound } from './middleware/errors.js';
import Room from './models/Room.js';

const app = express();
const uploadsDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CLIENT_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((item) => item.trim()), credentials: true }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', immutable: true }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'hotelpro-api', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/service-requests', serviceRoutes);

const storage = multer.diskStorage({
  destination: (_req, _file, done) => done(null, uploadsDir),
  filename: (_req, file, done) => done(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${path.extname(file.originalname).toLowerCase()}`),
});
const upload = multer({ storage, limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 5) * 1024 * 1024 }, fileFilter: (_req, file, done) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return done(new ApiError(415, 'Upload a JPG, PNG, or WebP image.'));
  done(null, true);
} });
app.post('/api/rooms/:id/images', authenticate, authorize('staff', 'admin'), upload.array('images', 8), async (req, res, next) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, ...(req.user.role === 'staff' ? { hotel: req.user.hotel } : {}) });
    if (!room) throw new ApiError(404, 'Room not found.');
    const urls = (req.files || []).map((file) => `/uploads/${file.filename}`);
    room.images.push(...urls);
    await room.save();
    res.status(201).json({ data: { room, images: urls } });
  } catch (error) { next(error); }
});

app.use(notFound);
app.use(errorHandler);
export default app;
