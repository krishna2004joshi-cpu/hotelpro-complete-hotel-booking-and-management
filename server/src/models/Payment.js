import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, enum: ['stripe', 'manual', 'demo'], default: 'stripe' },
  providerSessionId: { type: String, sparse: true, unique: true },
  paymentIntentId: { type: String, sparse: true, unique: true },
  amount: { type: Number, min: 0, required: true },
  currency: { type: String, required: true, uppercase: true },
  status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refund_pending', 'refunded'], default: 'pending', index: true },
  receiptUrl: String,
  refundId: String,
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
