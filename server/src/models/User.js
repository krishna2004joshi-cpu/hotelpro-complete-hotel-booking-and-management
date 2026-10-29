import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, index: true },
  password: { type: String, required: true, minlength: 10, select: false },
  role: { type: String, enum: ['guest', 'staff', 'admin'], default: 'guest', index: true },
  hotel: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', default: null, index: true },
  phone: { type: String, trim: true, maxlength: 30 },
  isActive: { type: Boolean, default: true },
  emailVerifiedAt: { type: Date, default: null },
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpiresAt: { type: Date, select: false },
  passwordResetTokenHash: { type: String, select: false },
  passwordResetExpiresAt: { type: Date, select: false },
  preferences: { locale: { type: String, default: 'en' }, currency: { type: String, default: 'EUR' } },
}, { timestamps: true, toJSON: { transform: (_doc, ret) => { delete ret.password; delete ret.__v; return ret; } } });

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
userSchema.methods.comparePassword = function comparePassword(candidate) { return bcrypt.compare(candidate, this.password); };

export default mongoose.model('User', userSchema);
