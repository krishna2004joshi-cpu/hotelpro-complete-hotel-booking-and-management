import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from './errors.js';

export async function authenticate(req, _res, next) {
  try {
    const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) throw new ApiError(401, 'Sign in to continue.');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('-password');
    if (!user || !user.isActive) throw new ApiError(401, 'This session is no longer active.');
    req.user = user;
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, 'Your session has expired. Sign in again.'));
  }
}

export async function optionalAuthenticate(req, _res, next) {
  if (!req.get('authorization')) return next();
  return authenticate(req, _res, next);
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, 'You do not have access to this action.'));
    next();
  };
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h', issuer: 'hotelpro-api', audience: 'hotelpro-client' });
}
