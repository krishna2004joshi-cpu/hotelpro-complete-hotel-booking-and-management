import mongoose from 'mongoose';

const adminLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true, maxlength: 120 },
  targetType: { type: String, required: true, maxlength: 80 },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  ip: { type: String, maxlength: 80 },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export default mongoose.model('AdminLog', adminLogSchema);
