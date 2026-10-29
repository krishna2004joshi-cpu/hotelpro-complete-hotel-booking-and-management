import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, trim: true, uppercase: true },
  category: { type: String, enum: ['classic', 'deluxe', 'suite', 'family'], required: true, index: true },
  description: { type: String, default: '', maxlength: 2000 },
  maxGuests: { type: Number, min: 1, max: 12, default: 2 },
  bedType: { type: String, default: 'Queen bed' },
  amenities: [{ type: String }],
  baseRate: { type: Number, min: 0, required: true },
  currency: { type: String, default: 'EUR', uppercase: true },
  images: [{ type: String }],
  status: { type: String, enum: ['available', 'occupied', 'cleaning', 'maintenance'], default: 'available', index: true },
  isActive: { type: Boolean, default: true, index: true },
  calendar: [{
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    active: { type: Boolean, default: true },
  }],
}, { timestamps: true });

roomSchema.index({ hotel: 1, code: 1 }, { unique: true });
roomSchema.index({ hotel: 1, category: 1, baseRate: 1, isActive: 1 });

export default mongoose.model('Room', roomSchema);
