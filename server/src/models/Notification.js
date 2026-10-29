import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['booking', 'payment', 'service', 'housekeeping', 'system'], default: 'system' },
  title: { type: String, required: true, maxlength: 140 },
  message: { type: String, required: true, maxlength: 1000 },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });
export default mongoose.model('Notification', notificationSchema);
