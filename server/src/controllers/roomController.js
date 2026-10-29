import { matchedData } from 'express-validator';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';
import Booking from '../models/Booking.js';
import { ApiError } from '../middleware/errors.js';

export async function listRooms(req, res, next) {
  try {
    const { checkIn, checkOut, category, guests, minPrice, maxPrice, page = 1, limit = 12 } = req.query;
    const query = { isActive: true, status: { $ne: 'maintenance' } };
    if (req.query.hotel) query.hotel = req.query.hotel;
    if (req.user?.role === 'staff') query.hotel = req.user.hotel;
    if (category) query.category = category;
    if (guests) query.maxGuests = { $gte: Math.min(Number(guests) || 1, 12) };
    if (minPrice || maxPrice) query.baseRate = { ...(minPrice ? { $gte: Number(minPrice) } : {}), ...(maxPrice ? { $lte: Number(maxPrice) } : {}) };
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new ApiError(400, 'Enter a valid date range.');
      query.calendar = { $not: { $elemMatch: { active: true, checkIn: { $lt: end }, checkOut: { $gt: start } } } };
    }
    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const [rooms, total] = await Promise.all([
      Room.find(query).populate('hotel', 'name slug address currency').sort({ baseRate: 1 }).skip((Math.max(Number(page) || 1, 1) - 1) * safeLimit).limit(safeLimit),
      Room.countDocuments(query),
    ]);
    res.json({ data: { rooms, pagination: { page: Number(page) || 1, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } } });
  } catch (error) { next(error); }
}

export async function getRoom(req, res, next) {
  try {
    const room = await Room.findOne({ _id: req.params.id, isActive: true, ...(req.user?.role === 'staff' ? { hotel: req.user.hotel } : {}) }).populate('hotel', 'name slug description address amenities currency checkInTime checkOutTime');
    if (!room) throw new ApiError(404, 'Room not found.');
    res.json({ data: { room } });
  } catch (error) { next(error); }
}

export async function createRoom(req, res, next) {
  try {
    const payload = matchedData(req);
    if (req.user.role === 'staff') payload.hotel = req.user.hotel;
    const hotel = await Hotel.findById(payload.hotel);
    if (!hotel || !hotel.isActive) throw new ApiError(404, 'Hotel not found.');
    const room = await Room.create(payload);
    res.status(201).json({ data: { room } });
  } catch (error) { next(error); }
}

export async function updateRoom(req, res, next) {
  try {
    const room = await Room.findOne({ _id: req.params.id, ...(req.user.role === 'staff' ? { hotel: req.user.hotel } : {}) });
    if (!room) throw new ApiError(404, 'Room not found.');
    const fields = ['name', 'category', 'description', 'maxGuests', 'bedType', 'amenities', 'baseRate', 'status', 'isActive', 'images'];
    for (const key of fields) if (req.body[key] !== undefined) room[key] = req.body[key];
    await room.save();
    res.json({ data: { room } });
  } catch (error) { next(error); }
}

export async function occupancy(req, res, next) {
  try {
    const hotelId = req.user.role === 'staff' ? req.user.hotel : req.query.hotelId;
    if (!hotelId) throw new ApiError(400, 'Choose a hotel to view occupancy.');
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const nextDay = new Date(date); nextDay.setDate(nextDay.getDate() + 1);
    const [totalRooms, occupied, arrivals, departures] = await Promise.all([
      Room.countDocuments({ hotel: hotelId, isActive: true }),
      Booking.countDocuments({ hotel: hotelId, status: { $in: ['confirmed', 'checked_in'] }, checkIn: { $lt: nextDay }, checkOut: { $gt: date } }),
      Booking.countDocuments({ hotel: hotelId, status: { $in: ['confirmed', 'pending_payment'] }, checkIn: { $gte: date, $lt: nextDay } }),
      Booking.countDocuments({ hotel: hotelId, status: 'checked_in', checkOut: { $gte: date, $lt: nextDay } }),
    ]);
    res.json({ data: { totalRooms, occupied, available: Math.max(totalRooms - occupied, 0), occupancy: totalRooms ? Math.round(occupied / totalRooms * 100) : 0, arrivals, departures } });
  } catch (error) { next(error); }
}
