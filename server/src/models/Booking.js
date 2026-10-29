import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, index: true },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  checkIn: { type: Date, required: true, index: true },
  checkOut: { type: Date, required: true, index: true },
  guestsCount: { type: Number, min: 1, max: 12, required: true },
  nights: { type: Number, min: 1, required: true },
  ratePerNight: { type: Number, min: 0, required: true },
  subtotal: { type: Number, min: 0, required: true },
  tax: { type: Number, min: 0, default: 0 },
  total: { type: Number, min: 0, required: true },
  currency: { type: String, default: 'EUR', uppercase: true },
  status: { type: String, enum: ['pending_payment', 'confirmed', 'checked_in', 'checked_out', 'cancel_requested', 'cancelled'], default: 'pending_payment', index: true },
  paymentStatus: { type: String, enum: ['unpaid', 'pending', 'paid', 'refund_requested', 'refunded'], default: 'unpaid', index: true },
  source: { type: String, enum: ['direct', 'phone', 'walk_in', 'partner'], default: 'direct' },
  specialRequest: { type: String, trim: true, maxlength: 1000 },
  cancellationReason: { type: String, trim: true, maxlength: 500 },
  checkedInAt: Date,
  checkedOutAt: Date,
  invoiceNumber: { type: String, unique: true, sparse: true },
}, { timestamps: true });

bookingSchema.index({ hotel: 1, checkIn: 1, status: 1 });
bookingSchema.index({ guest: 1, createdAt: -1 });

export default mongoose.model('Booking', bookingSchema);
