import Notification from '../models/Notification.js';

export async function notify(user, type, title, message, data = {}) {
  if (!user) return null;
  const notification = await Notification.create({ user, type, title, message, data });
  globalThis.hotelproIO?.to(String(user)).emit('notification:new', notification);
  return notification;
}
