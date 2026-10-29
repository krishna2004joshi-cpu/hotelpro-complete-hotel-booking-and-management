import { matchedData } from 'express-validator';
import ServiceRequest from '../models/ServiceRequest.js';
import HousekeepingTask from '../models/HousekeepingTask.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';
import { ApiError } from '../middleware/errors.js';
import { notify } from '../services/notificationService.js';

export async function createServiceRequest(req, res, next) {
  try {
    const { category, message, bookingId, roomId, priority } = matchedData(req);
    const booking = bookingId ? await Booking.findOne({ _id: bookingId, guest: req.user._id, status: 'checked_in' }) : null;
    if (bookingId && !booking) throw new ApiError(404, 'Active stay not found.');
    const room = booking ? await Room.findById(booking.room) : roomId ? await Room.findById(roomId) : null;
    if (roomId && (!room || (booking && String(room._id) !== String(booking.room)))) throw new ApiError(404, 'Room not found for this stay.');
    if (!room) throw new ApiError(422, 'Choose an active room or reservation for this request.');
    if (!booking) {
      const activeStay = await Booking.findOne({ guest: req.user._id, room: room._id, status: 'checked_in' });
      if (!activeStay) throw new ApiError(403, 'Service requests are available during an active stay.');
    }
    const request = await ServiceRequest.create({ hotel: room.hotel, guest: req.user._id, room: room._id, booking: booking?._id, category, message, priority });
    await notify(req.user._id, 'service', 'Request received', 'The hotel team has received your service request.', { requestId: request._id });
    res.status(201).json({ data: { request } });
  } catch (error) { next(error); }
}

export async function listServiceRequests(req, res, next) {
  try {
    const query = req.user.role === 'guest' ? { guest: req.user._id } : { hotel: req.user.hotel };
    if (req.query.status) query.status = req.query.status;
    const requests = await ServiceRequest.find(query).populate('guest', 'name email').populate('room', 'name code').populate('assignedTo', 'name').sort({ priority: -1, createdAt: -1 }).limit(100);
    res.json({ data: { requests } });
  } catch (error) { next(error); }
}

export async function updateServiceRequest(req, res, next) {
  try {
    const request = await ServiceRequest.findOne({ _id: req.params.id, hotel: req.user.hotel });
    if (!request) throw new ApiError(404, 'Service request not found.');
    if (req.body.status && ['open', 'in_progress', 'completed', 'cancelled'].includes(req.body.status)) {
      request.status = req.body.status;
      if (req.body.status === 'completed') request.completedAt = new Date();
    }
    if (req.body.assignedTo) {
      const assignee = await User.findOne({ _id: req.body.assignedTo, role: 'staff', hotel: request.hotel, isActive: true });
      if (!assignee) throw new ApiError(400, 'Choose an active team member from this property.');
      request.assignedTo = assignee._id;
    }
    await request.save();
    await notify(request.guest, 'service', 'Request updated', `Your ${request.category.replace('_', ' ')} request is now ${request.status.replace('_', ' ')}.`, { requestId: request._id });
    res.json({ data: { request } });
  } catch (error) { next(error); }
}

export async function createHousekeepingTask(req, res, next) {
  try {
    const { roomId, type, priority, dueAt } = matchedData(req);
    const room = await Room.findOne({ _id: roomId, hotel: req.user.hotel, isActive: true });
    if (!room) throw new ApiError(404, 'Room not found.');
    const task = await HousekeepingTask.create({ hotel: room.hotel, room: room._id, type, priority, dueAt });
    res.status(201).json({ data: { task } });
  } catch (error) { next(error); }
}

export async function listHousekeeping(req, res, next) {
  try {
    const query = { hotel: req.user.hotel };
    if (req.query.status) query.status = req.query.status;
    const tasks = await HousekeepingTask.find(query).populate('room', 'name code category status').populate('assignedTo', 'name').sort({ priority: -1, dueAt: 1 }).limit(200);
    res.json({ data: { tasks } });
  } catch (error) { next(error); }
}

export async function updateHousekeeping(req, res, next) {
  try {
    const task = await HousekeepingTask.findOne({ _id: req.params.id, hotel: req.user.hotel });
    if (!task) throw new ApiError(404, 'Housekeeping task not found.');
    if (['queued', 'in_progress', 'completed'].includes(req.body.status)) {
      task.status = req.body.status;
      if (req.body.status === 'completed') {
        task.completedAt = new Date();
        await Room.updateOne({ _id: task.room }, { $set: { status: 'available' } });
      }
    }
    if (req.body.assignedTo) {
      const assignee = await User.findOne({ _id: req.body.assignedTo, role: 'staff', hotel: task.hotel, isActive: true });
      if (!assignee) throw new ApiError(400, 'Choose an active team member from this property.');
      task.assignedTo = assignee._id;
    }
    await task.save();
    res.json({ data: { task } });
  } catch (error) { next(error); }
}
