import { matchedData } from 'express-validator';
import User from '../models/User.js';
import Hotel from '../models/Hotel.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import AdminLog from '../models/AdminLog.js';
import { ApiError } from '../middleware/errors.js';

export async function dashboardSummary(_req, res, next) {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const [hotels, rooms, guests, arrivals, departures, revenue, bookings, recentBookings] = await Promise.all([
      Hotel.countDocuments({ isActive: true }),
      Room.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'guest', isActive: true }),
      Booking.countDocuments({ checkIn: { $gte: today, $lt: tomorrow }, status: { $in: ['confirmed', 'pending_payment'] } }),
      Booking.countDocuments({ checkOut: { $gte: today, $lt: tomorrow }, status: 'checked_in' }),
      Payment.aggregate([{ $match: { status: 'succeeded' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Booking.countDocuments(),
      Booking.find().sort({ createdAt: -1 }).limit(8).populate('guest', 'name email').populate('room', 'name code category').populate('hotel', 'name'),
    ]);
    const occupied = await Room.countDocuments({ isActive: true, status: 'occupied' });
    res.json({ data: { hotels, rooms, guests, bookings, revenue: revenue[0]?.total || 0, occupancy: rooms ? Math.round(occupied / rooms * 100) : 0, arrivals, departures, recentBookings } });
  } catch (error) { next(error); }
}

export async function reportData(req, res, next) {
  try {
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - 29 * 86400000);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || from > to) throw new ApiError(400, 'Choose a valid report date range.');
    const [revenueByMonth, bookingsByStatus, roomMix, payments] = await Promise.all([
      Payment.aggregate([{ $match: { status: 'succeeded', createdAt: { $gte: from, $lte: to } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, revenue: { $sum: '$amount' }, transactions: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
      Booking.aggregate([{ $match: { createdAt: { $gte: from, $lte: to } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Booking.aggregate([{ $match: { createdAt: { $gte: from, $lte: to } } }, { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'room' } }, { $unwind: '$room' }, { $group: { _id: '$room.category', bookings: { $sum: 1 }, revenue: { $sum: '$total' } } }]),
      Payment.aggregate([{ $match: { createdAt: { $gte: from, $lte: to } } }, { $group: { _id: '$status', amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    ]);
    res.json({ data: { from, to, revenueByMonth, bookingsByStatus, roomMix, payments } });
  } catch (error) { next(error); }
}

export async function listUsers(req, res, next) {
  try {
    const query = {};
    if (req.query.role) query.role = req.query.role;
    if (req.query.search) query.$or = [{ name: { $regex: escapeRegex(req.query.search), $options: 'i' } }, { email: { $regex: escapeRegex(req.query.search), $options: 'i' } }];
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const [users, total] = await Promise.all([User.find(query).select('-password').populate('hotel', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), User.countDocuments(query)]);
    res.json({ data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
}

export async function updateUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new ApiError(404, 'User not found.');
    const { role, isActive, hotel, name } = matchedData(req);
    if (hotel) {
      const assignedHotel = await Hotel.findById(hotel);
      if (!assignedHotel || !assignedHotel.isActive) throw new ApiError(400, 'Choose an active hotel for this user.');
    }
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (hotel !== undefined) user.hotel = hotel || null;
    if (name) user.name = name;
    await user.save();
    await AdminLog.create({ actor: req.user._id, action: 'user.updated', targetType: 'User', targetId: user._id, ip: req.ip, details: { role: user.role, isActive: user.isActive } });
    res.json({ data: { user } });
  } catch (error) { next(error); }
}

export async function listHotels(_req, res, next) {
  try { res.json({ data: { hotels: await Hotel.find().sort({ name: 1 }) } }); }
  catch (error) { next(error); }
}

export async function createHotel(req, res, next) {
  try {
    const hotel = await Hotel.create(matchedData(req));
    await AdminLog.create({ actor: req.user._id, action: 'hotel.created', targetType: 'Hotel', targetId: hotel._id, ip: req.ip });
    res.status(201).json({ data: { hotel } });
  } catch (error) { next(error); }
}

export async function listAuditLogs(req, res, next) {
  try {
    const logs = await AdminLog.find().populate('actor', 'name email role').sort({ createdAt: -1 }).limit(Math.min(Number(req.query.limit) || 100, 250));
    res.json({ data: { logs } });
  } catch (error) { next(error); }
}

function escapeRegex(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
