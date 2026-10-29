import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, maxlength: 120 },
  comment: { type: String, trim: true, maxlength: 2000 },
  isPublished: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Review', reviewSchema);
