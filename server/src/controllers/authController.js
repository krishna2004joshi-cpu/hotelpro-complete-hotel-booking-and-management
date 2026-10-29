import { randomBytes, createHash } from 'node:crypto';
import { matchedData } from 'express-validator';
import User from '../models/User.js';
import { ApiError } from '../middleware/errors.js';
import { signToken } from '../middleware/auth.js';
import { sendEmail, sendVerificationEmail } from '../services/emailService.js';
import AdminLog from '../models/AdminLog.js';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const authPayload = (user) => ({ token: signToken(user), user: user.toJSON() });

export async function register(req, res, next) {
  try {
    const { name, email, password } = matchedData(req);
    const user = await User.create({ name, email, password, role: 'guest' });
    const token = randomBytes(32).toString('hex');
    user.emailVerificationTokenHash = hashToken(token);
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    await sendVerificationEmail(user, token);
    res.status(201).json({ data: { message: 'Account created. Verify your email to sign in.', ...(process.env.NODE_ENV === 'development' ? { verificationToken: token } : {}) } });
  } catch (error) { next(error); }
}

export async function verifyEmail(req, res, next) {
  try {
    const { token } = matchedData(req);
    const user = await User.findOne({ emailVerificationTokenHash: hashToken(token), emailVerificationExpiresAt: { $gt: new Date() } }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');
    if (!user) throw new ApiError(400, 'This verification link is invalid or has expired.');
    user.emailVerifiedAt = new Date();
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    res.json({ data: { message: 'Your email is verified. You can sign in now.' } });
  } catch (error) { next(error); }
}

export async function login(req, res, next) {
  try {
    const { email, password } = matchedData(req);
    const user = await User.findOne({ email }).select('+password');
    const valid = user && user.isActive && await user.comparePassword(password);
    if (!valid) throw new ApiError(401, 'Email or password is incorrect.');
    if (!user.emailVerifiedAt) throw new ApiError(403, 'Verify your email before signing in.');
    res.json({ data: authPayload(user) });
  } catch (error) { next(error); }
}

export async function me(req, res) {
  res.json({ data: { user: req.user.toJSON() } });
}

export async function logout(_req, res) {
  res.json({ data: { message: 'Signed out. Remove the access token from this device.' } });
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = matchedData(req);
    const user = await User.findOne({ email, isActive: true });
    let resetToken;
    if (user) {
      resetToken = randomBytes(32).toString('hex');
      user.passwordResetTokenHash = hashToken(resetToken);
      user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      const link = `${process.env.CLIENT_URL || 'http://localhost:5173'}/#/reset-password?token=${encodeURIComponent(resetToken)}`;
      await sendEmail({ to: user.email, subject: 'Reset your HotelPro password', text: `Reset your password within 30 minutes: ${link}` });
    }
    res.json({ data: { message: 'If an account exists for that address, a reset link is on its way.', ...(process.env.NODE_ENV === 'development' && resetToken ? { resetToken } : {}) } });
  } catch (error) { next(error); }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = matchedData(req);
    const user = await User.findOne({ passwordResetTokenHash: hashToken(token), passwordResetExpiresAt: { $gt: new Date() }, isActive: true }).select('+passwordResetTokenHash +passwordResetExpiresAt');
    if (!user) throw new ApiError(400, 'This password reset link is invalid or has expired.');
    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    await AdminLog.create({ actor: user._id, action: 'password.reset', targetType: 'User', targetId: user._id, ip: req.ip });
    res.json({ data: { message: 'Password updated. Sign in with your new password.' } });
  } catch (error) { next(error); }
}
