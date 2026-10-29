import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import { ApiError } from '../middleware/errors.js';
import { sendBookingEmail } from '../services/emailService.js';
import { notify } from '../services/notificationService.js';
import Room from '../models/Room.js';

let stripe;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!stripe) stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripe;
}

export async function createCheckout(req, res, next) {
  try {
    const booking = await Booking.findOne({ _id: req.params.bookingId, guest: req.user._id }).populate('room hotel guest');
    if (!booking) throw new ApiError(404, 'Reservation not found.');
    if (booking.status !== 'pending_payment' || booking.paymentStatus === 'paid') throw new ApiError(409, 'This reservation is not awaiting payment.');
    const provider = getStripe();
    if (!provider) {
      if (process.env.NODE_ENV === 'production') throw new ApiError(503, 'Online payments are not configured yet. Contact the hotel to complete this reservation.');
      const payment = await Payment.create({ booking: booking._id, guest: req.user._id, provider: 'demo', amount: booking.total, currency: booking.currency, status: 'pending' });
      return res.json({ data: { payment, checkoutUrl: null, demoPayment: true } });
    }
    const session = await provider.checkout.sessions.create({
      mode: 'payment',
      customer_email: req.user.email,
      line_items: [{ quantity: 1, price_data: { currency: booking.currency.toLowerCase(), unit_amount: Math.round(booking.total * 100), product_data: { name: `${booking.hotel.name} · ${booking.room.name}`, description: `${booking.nights} night stay · ${booking.reference}` } } }],
      metadata: { bookingId: String(booking._id), guestId: String(req.user._id) },
      success_url: `${process.env.CLIENT_URL}/#/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/#/payment/cancelled?booking=${booking._id}`,
    });
    const payment = await Payment.create({ booking: booking._id, guest: req.user._id, provider: 'stripe', providerSessionId: session.id, amount: booking.total, currency: booking.currency, status: 'pending' });
    booking.paymentStatus = 'pending';
    await booking.save();
    res.json({ data: { payment, checkoutUrl: session.url } });
  } catch (error) { next(error); }
}

export async function completeDemoPayment(req, res, next) {
  try {
    if (process.env.NODE_ENV === 'production') throw new ApiError(404, 'Not found.');
    const payment = await Payment.findOne({ _id: req.params.paymentId, guest: req.user._id, provider: 'demo', status: 'pending' });
    if (!payment) throw new ApiError(404, 'Demo payment not found.');
    await confirmPayment(payment, { receiptUrl: null });
    res.json({ data: { payment, message: 'Demo payment completed.' } });
  } catch (error) { next(error); }
}

export async function stripeWebhook(req, res) {
  const provider = getStripe();
  if (!provider || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).send('Payment webhook is not configured.');
  let event;
  try { event = provider.webhooks.constructEvent(req.body, req.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET); }
  catch (_error) { return res.status(400).send('Invalid webhook signature.'); }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const payment = await Payment.findOne({ providerSessionId: session.id });
      if (payment && payment.status !== 'succeeded') await confirmPayment(payment, { receiptUrl: null, paymentIntentId: session.payment_intent?.id || session.payment_intent || null });
    } else if (event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object;
      const payment = await Payment.findOneAndUpdate({ providerSessionId: session.id, status: 'pending' }, { status: 'failed' }, { new: true });
      if (payment) await Booking.updateOne({ _id: payment.booking, status: 'pending_payment' }, { paymentStatus: 'unpaid' });
    }
    return res.json({ received: true });
  } catch (error) {
    console.error('Payment webhook processing failed:', error);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }
}

export async function listPayments(req, res, next) {
  try {
    const query = req.user.role === 'guest' ? { guest: req.user._id } : {};
    if (req.user.role === 'staff') {
      const hotelBookings = await Booking.find({ hotel: req.user.hotel }).select('_id');
      query.booking = { $in: hotelBookings.map((booking) => booking._id) };
    }
    const payments = await Payment.find(query).populate('booking', 'reference total currency status').sort({ createdAt: -1 }).limit(100);
    res.json({ data: { payments } });
  } catch (error) { next(error); }
}

export async function requestRefund(req, res, next) {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('booking');
    if (!payment) throw new ApiError(404, 'Payment not found.');
    const allowed = req.user.role === 'admin' || (req.user.role === 'guest' && String(payment.guest) === String(req.user._id)) || (req.user.role === 'staff' && String(payment.booking?.hotel) === String(req.user.hotel));
    if (!allowed) throw new ApiError(404, 'Payment not found.');
    if (payment.status !== 'succeeded') throw new ApiError(409, 'Only successful payments can be refunded.');
    if (payment.provider === 'stripe' && !payment.paymentIntentId) throw new ApiError(409, 'This payment cannot be refunded automatically. Contact the payment administrator.');
    if (payment.provider === 'stripe' && getStripe()) {
      const refund = await getStripe().refunds.create({ payment_intent: payment.paymentIntentId, reason: 'requested_by_customer' });
      payment.refundId = refund.id;
      payment.status = refund.status === 'succeeded' ? 'refunded' : 'refund_pending';
    } else {
      payment.status = 'refund_pending';
    }
    payment.booking.paymentStatus = payment.status === 'refunded' ? 'refunded' : 'refund_requested';
    payment.booking.status = 'cancelled';
    await Promise.all([payment.save(), payment.booking.save(), Room.updateOne({ _id: payment.booking.room }, { $set: { 'calendar.$[entry].active': false } }, { arrayFilters: [{ 'entry.booking': payment.booking._id }] })]);
    res.json({ data: { payment, message: 'Refund has been recorded for processing.' } });
  } catch (error) { next(error); }
}

async function confirmPayment(payment, { receiptUrl, paymentIntentId = null }) {
  const booking = await Booking.findById(payment.booking).populate('guest room hotel');
  if (!booking) throw new ApiError(404, 'Reservation not found for payment.');
  payment.status = 'succeeded';
  payment.receiptUrl = receiptUrl;
  if (paymentIntentId) payment.paymentIntentId = paymentIntentId;
  await payment.save();
  booking.status = 'confirmed';
  booking.paymentStatus = 'paid';
  await booking.save();
  await notify(booking.guest._id, 'payment', 'Payment received', `Payment for reservation ${booking.reference} is complete.`, { bookingId: booking._id });
  sendBookingEmail(booking, booking.guest, booking.room, booking.hotel).catch((error) => console.error('Booking email failed:', error.message));
}
