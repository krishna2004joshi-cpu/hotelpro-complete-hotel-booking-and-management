import Notification from '../models/Notification.js';
import { ApiError } from '../middleware/errors.js';

export async function listNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    const unread = notifications.filter((item) => !item.readAt).length;
    res.json({ data: { notifications, unread } });
  } catch (error) { next(error); }
}

export async function markRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { readAt: new Date() }, { new: true });
    if (!notification) throw new ApiError(404, 'Notification not found.');
    res.json({ data: { notification } });
  } catch (error) { next(error); }
}

export async function markAllRead(req, res, next) {
  try {
    await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() });
    res.json({ data: { message: 'Notifications marked as read.' } });
  } catch (error) { next(error); }
}
