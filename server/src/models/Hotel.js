import mongoose from 'mongoose';

const hotelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, default: '', maxlength: 3000 },
  address: { line1: String, city: String, region: String, postalCode: String, country: String },
  timezone: { type: String, default: 'Europe/Paris' },
  currency: { type: String, default: 'EUR', uppercase: true, minlength: 3, maxlength: 3 },
  contactEmail: { type: String, lowercase: true, trim: true },
  phone: String,
  amenities: [{ type: String, trim: true }],
  checkInTime: { type: String, default: '15:00' },
  checkOutTime: { type: String, default: '11:00' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Hotel', hotelSchema);
