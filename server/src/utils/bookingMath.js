import { ApiError } from '../middleware/errors.js';

export function parseStay(checkInValue, checkOutValue) {
  const checkIn = new Date(checkInValue);
  const checkOut = new Date(checkOutValue);
  if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime())) throw new ApiError(400, 'Enter valid check-in and check-out dates.');
  if (checkIn < startOfToday()) throw new ApiError(400, 'Check-in cannot be in the past.');
  if (checkOut <= checkIn) throw new ApiError(400, 'Check-out must be after check-in.');
  const nights = Math.ceil((Date.UTC(checkOut.getUTCFullYear(), checkOut.getUTCMonth(), checkOut.getUTCDate()) - Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate())) / 86400000);
  if (nights > 60) throw new ApiError(400, 'A stay can be up to 60 nights.');
  return { checkIn, checkOut, nights };
}

export function calculatePrice(ratePerNight, nights, taxRate = 0.1) {
  const subtotal = Math.round(Number(ratePerNight) * nights * 100) / 100;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  return { subtotal, tax, total: Math.round((subtotal + tax) * 100) / 100 };
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
