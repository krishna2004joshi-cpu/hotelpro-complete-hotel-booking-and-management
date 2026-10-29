import { matchedData } from 'express-validator';
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import { ApiError } from '../middleware/errors.js';
import AdminLog from '../models/AdminLog.js';
import mongoose from 'mongoose';

export async function listReviews(req, res, next) {
  try {
    const query = { isPublished: true };
    if (req.query.hotelId) {
      if (!mongoose.isValidObjectId(req.query.hotelId)) throw new ApiError(400, 'Choose a valid hotel.');
      query.hotel = req.query.hotelId;
    }
    const [reviews, summary] = await Promise.all([
      Review.find(query).populate('guest', 'name').sort({ createdAt: -1 }).limit(100),
      Review.aggregate([{ $match: { isPublished: true, ...(req.query.hotelId ? { hotel: new mongoose.Types.ObjectId(req.query.hotelId) } : {}) } }, { $group: { _id: '$hotel', average: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    ]);
    res.json({ data: { reviews, summary: summary[0] || { average: 0, count: 0 } } });
  } catch (error) { next(error); }
}

export async function createReview(req, res, next) {
  try {
    const { bookingId, rating, title, comment } = matchedData(req);
    const booking = await Booking.findOne({ _id: bookingId, guest: req.user._id, status: 'checked_out' });
    if (!booking) throw new ApiError(409, 'Reviews are available after checkout.');
    const review = await Review.create({ booking: booking._id, guest: req.user._id, hotel: booking.hotel, rating, title, comment });
    res.status(201).json({ data: { review, message: 'Thanks for sharing your feedback. It will appear after review.' } });
  } catch (error) { next(error); }
}

export async function moderateReview(req, res, next) {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) throw new ApiError(404, 'Review not found.');
    review.isPublished = Boolean(req.body.isPublished);
    await review.save();
    await AdminLog.create({ actor: req.user._id, action: review.isPublished ? 'review.published' : 'review.hidden', targetType: 'Review', targetId: review._id, ip: req.ip });
    res.json({ data: { review } });
  } catch (error) { next(error); }
}
