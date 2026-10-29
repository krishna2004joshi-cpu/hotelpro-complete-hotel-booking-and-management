import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/db.js';
import Hotel from '../src/models/Hotel.js';
import Room from '../src/models/Room.js';
import User from '../src/models/User.js';
import Booking from '../src/models/Booking.js';
import Payment from '../src/models/Payment.js';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('The demo seed is disabled in production. Set ALLOW_DEMO_SEED=true only for an intentional demo database.');
}
await connectDatabase();
const hotel = await Hotel.findOneAndUpdate({ slug: 'hotelpro-paris' }, {
  $setOnInsert: {
    name: 'Maison Aurore', slug: 'maison-aurore', description: 'A calm boutique stay in the heart of Paris, with considered service and a little room to breathe.',
    address: { line1: '18 Rue de la Paix', city: 'Paris', region: 'Île-de-France', postalCode: '75002', country: 'France' },
    timezone: 'Europe/Paris', currency: 'EUR', contactEmail: 'hello@hotelpro.local', phone: '+33 1 42 61 20 20',
    amenities: ['Wi-Fi', 'Breakfast', 'Concierge', 'Fitness room'], checkInTime: '15:00', checkOutTime: '11:00', isActive: true,
  },
}, { new: true, upsert: true });

const accounts = [
  { name: 'HotelPro Admin', email: 'admin@hotelpro.local', password: 'HotelPro!Demo2026', role: 'admin', hotel: null },
  { name: 'HotelPro Manager', email: 'staff@hotelpro.local', password: 'HotelPro!Demo2026', role: 'staff', hotel: hotel._id },
  { name: 'Alex Morgan', email: 'guest@hotelpro.local', password: 'HotelPro!Demo2026', role: 'guest', hotel: null },
];
for (const account of accounts) {
  const existing = await User.findOne({ email: account.email });
  if (!existing) await User.create({ ...account, emailVerifiedAt: new Date() });
}

const roomSpecs = [
  ['Classic Courtyard', '101', 'classic', 'A quiet room with courtyard views and warm, natural finishes.', 2, 'Queen bed', 189, ['Wi-Fi', 'Rain shower', 'Courtyard view']],
  ['Classic City', '102', 'classic', 'A bright city-side room for a comfortable weekend away.', 2, 'Queen bed', 209, ['Wi-Fi', 'Rain shower', 'City view']],
  ['Deluxe Balcony', '201', 'deluxe', 'Step onto a private balcony above the Paris rooftops.', 2, 'King bed', 279, ['Wi-Fi', 'Balcony', 'Rain shower', 'Minibar']],
  ['Deluxe Twin', '202', 'deluxe', 'A spacious twin room for friends or family.', 3, 'Twin beds', 299, ['Wi-Fi', 'Rain shower', 'Minibar']],
  ['Junior Suite', '301', 'suite', 'A generous suite with a separate sitting area.', 3, 'King bed', 389, ['Wi-Fi', 'Sitting area', 'Soaking tub', 'Minibar']],
  ['Family Residence', '401', 'family', 'Two connecting spaces with room for the whole family.', 4, 'King + twin beds', 449, ['Wi-Fi', 'Connecting rooms', 'Soaking tub', 'Minibar']],
];
for (const [name, code, category, description, maxGuests, bedType, baseRate, amenities] of roomSpecs) {
  await Room.updateOne({ hotel: hotel._id, code }, { $setOnInsert: { hotel: hotel._id, name, code, category, description, maxGuests, bedType, baseRate, currency: 'EUR', amenities, status: 'available', isActive: true } }, { upsert: true });
}

if (process.env.SEED_SAMPLE_BOOKINGS === 'true') {
  const guest = await User.findOne({ email: 'guest@hotelpro.local' });
  const rooms = await Room.find({ hotel: hotel._id }).sort({ code: 1 }).limit(4);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const arrivalOffsets = [-1, 0, -4, 3];
  for (let index = 0; index < rooms.length; index++) {
    const room = rooms[index];
    const checkIn = new Date(startOfToday); checkIn.setDate(checkIn.getDate() + arrivalOffsets[index]);
    const checkOut = new Date(checkIn); checkOut.setDate(checkOut.getDate() + 2);
    const status = index === 0 ? 'checked_in' : index === 1 ? 'confirmed' : index === 2 ? 'checked_out' : 'confirmed';
    const reference = `HP-DEMO-${room.code}`;
    const booking = await Booking.findOneAndUpdate({ reference }, { $setOnInsert: {
      reference, hotel: hotel._id, guest: guest._id, room: room._id, checkIn, checkOut, guestsCount: 2, nights: 2,
      ratePerNight: room.baseRate, subtotal: room.baseRate * 2, tax: Math.round(room.baseRate * 0.2 * 100) / 100,
      total: Math.round(room.baseRate * 2.2 * 100) / 100, currency: 'EUR', status, paymentStatus: 'paid', source: 'direct', invoiceNumber: `INV-DEMO-${room.code}`,
      ...(status === 'checked_in' ? { checkedInAt: new Date() } : {}), ...(status === 'checked_out' ? { checkedOutAt: new Date() } : {}),
    } }, { upsert: true, new: true });
    if (status !== 'checked_out') await Room.updateOne({ _id: room._id, 'calendar.booking': { $ne: booking._id } }, { $push: { calendar: { booking: booking._id, checkIn, checkOut, active: true } }, $set: { status: status === 'checked_in' ? 'occupied' : 'available' } });
    await Payment.updateOne({ booking: booking._id }, { $setOnInsert: { booking: booking._id, guest: guest._id, provider: 'manual', amount: booking.total, currency: 'EUR', status: 'succeeded' } }, { upsert: true });
  }
}

console.info(`Seeded ${hotel.name}. Demo logins use admin@hotelpro.local, staff@hotelpro.local, or guest@hotelpro.local; password: HotelPro!Demo2026`);
await mongoose.disconnect();
