const daysFromNow = (days) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };
export const demoUsers = {
  admin: { name: 'Morgan Ellis', email: 'admin@hotelpro.local', role: 'admin', hotel: null },
  staff: { name: 'Sofia Laurent', email: 'staff@hotelpro.local', role: 'staff', hotel: 'hotel-paris' },
  guest: { name: 'Alex Morgan', email: 'guest@hotelpro.local', role: 'guest', hotel: null },
};
export const demoRooms = [
  { _id: 'room-101', name: 'Classic Courtyard', code: '101', category: 'classic', description: 'A peaceful hideaway with courtyard views and thoughtful details.', maxGuests: 2, bedType: 'Queen bed', baseRate: 189, currency: 'EUR', status: 'available', amenities: ['Courtyard view', 'Rain shower', 'Wi-Fi'], hotel: { _id: 'hotel-paris', name: 'Maison Aurore', address: { city: 'Paris' } } },
  { _id: 'room-102', name: 'Classic City', code: '102', category: 'classic', description: 'A bright room made for long mornings and easy evenings.', maxGuests: 2, bedType: 'Queen bed', baseRate: 209, currency: 'EUR', status: 'available', amenities: ['City view', 'Rain shower', 'Wi-Fi'], hotel: { _id: 'hotel-paris', name: 'Maison Aurore', address: { city: 'Paris' } } },
  { _id: 'room-201', name: 'Deluxe Balcony', code: '201', category: 'deluxe', description: 'Private balcony, soft linen, and a view over the rooftops.', maxGuests: 2, bedType: 'King bed', baseRate: 279, currency: 'EUR', status: 'occupied', amenities: ['Private balcony', 'Minibar', 'Wi-Fi'], hotel: { _id: 'hotel-paris', name: 'Maison Aurore', address: { city: 'Paris' } } },
  { _id: 'room-301', name: 'Junior Suite', code: '301', category: 'suite', description: 'A generous suite with a separate sitting room and soaking tub.', maxGuests: 3, bedType: 'King bed', baseRate: 389, currency: 'EUR', status: 'cleaning', amenities: ['Sitting area', 'Soaking tub', 'Minibar'], hotel: { _id: 'hotel-paris', name: 'Maison Aurore', address: { city: 'Paris' } } },
  { _id: 'room-401', name: 'Family Residence', code: '401', category: 'family', description: 'Two connected spaces that make travelling together feel easy.', maxGuests: 4, bedType: 'King + twin beds', baseRate: 449, currency: 'EUR', status: 'available', amenities: ['Connecting rooms', 'Soaking tub', 'Wi-Fi'], hotel: { _id: 'hotel-paris', name: 'Maison Aurore', address: { city: 'Paris' } } },
];
export const demoBookings = [
  { _id: 'booking-1', reference: 'HP-8F3K2A', guest: { name: 'Amelia Clarke', email: 'amelia@example.com' }, room: demoRooms[2], checkIn: daysFromNow(0), checkOut: daysFromNow(3), guestsCount: 2, nights: 3, total: 921, currency: 'EUR', status: 'checked_in', paymentStatus: 'paid' },
  { _id: 'booking-2', reference: 'HP-8F3K1D', guest: { name: 'Noah Bennett', email: 'noah@example.com' }, room: demoRooms[0], checkIn: daysFromNow(0), checkOut: daysFromNow(2), guestsCount: 1, nights: 2, total: 415.8, currency: 'EUR', status: 'confirmed', paymentStatus: 'paid' },
  { _id: 'booking-3', reference: 'HP-8F2H7Q', guest: { name: 'Priya Sharma', email: 'priya@example.com' }, room: demoRooms[3], checkIn: daysFromNow(-2), checkOut: daysFromNow(0), guestsCount: 2, nights: 2, total: 855.8, currency: 'EUR', status: 'checked_out', paymentStatus: 'paid' },
  { _id: 'booking-4', reference: 'HP-8G9L4M', guest: { name: 'Oliver James', email: 'oliver@example.com' }, room: demoRooms[1], checkIn: daysFromNow(1), checkOut: daysFromNow(4), guestsCount: 2, nights: 3, total: 689.7, currency: 'EUR', status: 'confirmed', paymentStatus: 'paid' },
  { _id: 'booking-5', reference: 'HP-8G7R1P', guest: { name: 'Luca Moreau', email: 'luca@example.com' }, room: demoRooms[4], checkIn: daysFromNow(3), checkOut: daysFromNow(8), guestsCount: 3, nights: 5, total: 2469.5, currency: 'EUR', status: 'pending_payment', paymentStatus: 'pending' },
];
export const demoTasks = [
  { _id: 'task-1', room: demoRooms[3], type: 'turnover', status: 'in_progress', priority: 'high', dueAt: new Date(Date.now() + 45 * 60000).toISOString() },
  { _id: 'task-2', room: demoRooms[1], type: 'refresh', status: 'queued', priority: 'normal', dueAt: new Date(Date.now() + 110 * 60000).toISOString() },
  { _id: 'task-3', room: demoRooms[4], type: 'inspection', status: 'queued', priority: 'normal', dueAt: new Date(Date.now() + 180 * 60000).toISOString() },
];
export const demoRequests = [
  { _id: 'request-1', guest: { name: 'Amelia Clarke' }, room: demoRooms[2], category: 'room_service', message: 'Could we have two extra pillows, please?', status: 'in_progress', priority: 'normal' },
  { _id: 'request-2', guest: { name: 'Priya Sharma' }, room: demoRooms[3], category: 'housekeeping', message: 'Please leave fresh towels after 2 pm.', status: 'open', priority: 'normal' },
];
export const demoSummary = { hotels: 3, rooms: 48, guests: 1284, bookings: 386, revenue: 82450, occupancy: 78, arrivals: 12, departures: 8 };
