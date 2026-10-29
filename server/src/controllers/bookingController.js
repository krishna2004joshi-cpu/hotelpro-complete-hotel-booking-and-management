import mongoose from 'mongoose';
import { matchedData } from 'express-validator';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import { ApiError } from '../middleware/errors.js';
import { calculatePrice, parseStay } from '../utils/bookingMath.js';
import { notify } from '../services/notificationService.js';
import { sendBookingEmail } from '../services/emailService.js';
import HousekeepingTask from '../models/HousekeepingTask.js';

const populateBooking = (query) => query.populate('room', 'name code category images').populate('hotel', 'name address currency checkInTime checkOutTime').populate('guest', 'name email phone');

export async function createBooking(req, res, next) {
  let room;
  const bookingId = new mongoose.Types.ObjectId();
  try {
    const { roomId, checkIn: checkInValue, checkOut: checkOutValue, guestsCount, specialRequest } = matchedData(req);
    const { checkIn, checkOut, nights } = parseStay(checkInValue, checkOutValue);
    const reservationFilter = {
      _id: roomId,
      isActive: true,
      status: { $ne: 'maintenance' },
      maxGuests: { $gte: guestsCount },
      calendar: { $not: { $elemMatch: { active: true, checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } } } },
    };
    room = await Room.findOneAndUpdate(reservationFilter, { $push: { calendar: { booking: bookingId, checkIn, checkOut, active: true } } }, { new: true });
    if (!room) throw new ApiError(409, 'That room is no longer available for those dates. Search again to see current availability.');
    const { subtotal, tax, total } = calculatePrice(room.baseRate, nights, Number(process.env.TAX_RATE || 0.1));
    const booking = await Booking.create({
      _id: bookingId,
      reference: `HP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      hotel: room.hotel,
      guest: req.user._id,
      room: room._id,
      checkIn,
      checkOut,
      guestsCount,
      nights,
      ratePerNight: room.baseRate,
      subtotal,
      tax,
      total,
      currency: room.currency,
      status: 'pending_payment',
      paymentStatus: 'unpaid',
      source: 'direct',
      specialRequest,
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
    });
    await notify(req.user._id, 'booking', 'Reservation started', `Your stay at ${room.name} is ready for payment.`, { bookingId: booking._id, reference: booking.reference });
    res.status(201).json({ data: { booking: await populateBooking(Booking.findById(booking._id)) } });
  } catch (error) {
    if (room) await Room.updateOne({ _id: room._id }, { $pull: { calendar: { booking: bookingId } } }).catch(() => {});
    next(error);
  }
}

export async function listBookings(req, res, next) {
  try {
    const query = {};
    if (req.user.role === 'guest') query.guest = req.user._id;
    else if (req.user.role === 'staff') query.hotel = req.user.hotel;
    else if (req.query.hotelId) query.hotel = req.query.hotelId;
    if (req.query.status) query.status = req.query.status;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    const [bookings, total] = await Promise.all([
      populateBooking(Booking.find(query).sort({ checkIn: -1 }).skip((page - 1) * limit).limit(limit)),
      Booking.countDocuments(query),
    ]);
    res.json({ data: { bookings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } });
  } catch (error) { next(error); }
}

export async function getBooking(req, res, next) {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === 'guest') query.guest = req.user._id;
    else if (req.user.role === 'staff') query.hotel = req.user.hotel;
    const booking = await populateBooking(Booking.findOne(query));
    if (!booking) throw new ApiError(404, 'Reservation not found.');
    res.json({ data: { booking } });
  } catch (error) { next(error); }
}

export async function requestCancellation(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, guest: req.user._id });
    if (!booking) throw new ApiError(404, 'Reservation not found.');
    if (!['pending_payment', 'confirmed'].includes(booking.status) || booking.checkIn <= new Date()) throw new ApiError(409, 'This reservation can no longer be cancelled online. Contact the front desk for help.');
    booking.cancellationReason = String(req.body.reason || '').trim().slice(0, 500);
    if (booking.paymentStatus === 'paid') {
      booking.status = 'cancel_requested';
      booking.paymentStatus = 'refund_requested';
    } else {
      booking.status = 'cancelled';
      booking.paymentStatus = 'unpaid';
      await Room.updateOne({ _id: booking.room }, { $set: { 'calendar.$[entry].active': false } }, { arrayFilters: [{ 'entry.booking': booking._id }] });
    }
    await booking.save();
    await notify(req.user._id, 'booking', 'Cancellation request received', `We have updated reservation ${booking.reference}.`, { bookingId: booking._id });
    res.json({ data: { booking, message: booking.status === 'cancel_requested' ? 'Your refund request was sent to the hotel team.' : 'Your reservation has been cancelled.' } });
  } catch (error) { next(error); }
}

export async function invoice(req, res, next) {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === 'guest') query.guest = req.user._id;
    else if (req.user.role === 'staff') query.hotel = req.user.hotel;
    const booking = await populateBooking(Booking.findOne(query));
    if (!booking) throw new ApiError(404, 'Invoice not found.');
    const fmt = (date) => new Date(date).toLocaleDateString('en-GB', { dateStyle: 'medium' });
    res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${booking.invoiceNumber}</title><style>body{font:16px Arial,sans-serif;max-width:720px;margin:60px auto;padding:24px;color:#24342d}header{display:flex;justify-content:space-between;border-bottom:2px solid #345342;padding-bottom:18px}h1{font-size:26px}table{width:100%;border-collapse:collapse;margin-top:28px}td{padding:12px;border-bottom:1px solid #ddd}td:last-child{text-align:right}.total{font-weight:bold;font-size:19px}</style></head><body><header><div><strong>HOTELPRO</strong><p>${escapeHtml(booking.hotel?.name || 'Hotel')}</p></div><div><h1>Invoice</h1><span>${escapeHtml(booking.invoiceNumber || booking.reference)}</span></div></header><p>Guest: ${escapeHtml(booking.guest?.name || '')}<br>Booking: ${escapeHtml(booking.reference)}<br>Stay: ${fmt(booking.checkIn)} – ${fmt(booking.checkOut)} · ${booking.nights} nights</p><table><tr><td>${escapeHtml(booking.room?.name || 'Room')} × ${booking.nights} nights</td><td>${booking.currency} ${booking.subtotal.toFixed(2)}</td></tr><tr><td>Tax</td><td>${booking.currency} ${booking.tax.toFixed(2)}</td></tr><tr class="total"><td>Total</td><td>${booking.currency} ${booking.total.toFixed(2)}</td></tr></table></body></html>`);
  } catch (error) { next(error); }
}

export async function markCheckedIn(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, hotel: req.user.hotel, status: 'confirmed' });
    if (!booking) throw new ApiError(409, 'Only confirmed reservations can be checked in.');
    booking.status = 'checked_in';
    booking.checkedInAt = new Date();
    await booking.save();
    await Room.updateOne({ _id: booking.room }, { $set: { status: 'occupied' } });
    await notify(booking.guest, 'booking', 'Welcome to the hotel', `You have checked in for reservation ${booking.reference}.`, { bookingId: booking._id });
    res.json({ data: { booking } });
  } catch (error) { next(error); }
}

export async function markCheckedOut(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, hotel: req.user.hotel, status: 'checked_in' });
    if (!booking) throw new ApiError(409, 'Only checked-in reservations can be checked out.');
    booking.status = 'checked_out';
    booking.checkedOutAt = new Date();
    await booking.save();
    await Room.updateOne({ _id: booking.room }, { $set: { status: 'cleaning', 'calendar.$[entry].active': false } }, { arrayFilters: [{ 'entry.booking': booking._id }] });
    await HousekeepingTask.create({ hotel: booking.hotel, room: booking.room, type: 'turnover', priority: 'high', dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000) });
    res.json({ data: { booking, message: 'Checked out. A room turnover task was added.' } });
  } catch (error) { next(error); }
}

function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
