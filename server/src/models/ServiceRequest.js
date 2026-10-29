import mongoose from 'mongoose';

const serviceRequestSchema = new mongoose.Schema({
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  category: { type: String, enum: ['housekeeping', 'maintenance', 'room_service', 'concierge', 'other'], required: true },
  message: { type: String, required: true, trim: true, maxlength: 1200 },
  priority: { type: String, enum: ['normal', 'high'], default: 'normal' },
  status: { type: String, enum: ['open', 'in_progress', 'completed', 'cancelled'], default: 'open', index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  completedAt: Date,
}, { timestamps: true });

export default mongoose.model('ServiceRequest', serviceRequestSchema);
