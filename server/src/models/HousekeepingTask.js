import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  type: { type: String, enum: ['turnover', 'refresh', 'deep_clean', 'inspection'], default: 'turnover' },
  status: { type: String, enum: ['queued', 'in_progress', 'completed'], default: 'queued', index: true },
  priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  dueAt: Date,
  completedAt: Date,
}, { timestamps: true });

export default mongoose.model('HousekeepingTask', taskSchema);
