import nodemailer from 'nodemailer';

let transporter;
function getTransporter() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) return null;
  if (!transporter) transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  });
  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const transport = getTransporter();
  if (!transport) {
    if (process.env.NODE_ENV === 'production') throw new Error('Email service is not configured.');
    console.info(`[HotelPro email preview] to=${to} subject=${subject}\n${text || ''}`);
    return { preview: true };
  }
  return transport.sendMail({ from: process.env.EMAIL_FROM || 'HotelPro <no-reply@hotelpro.local>', to, subject, text, html });
}

export async function sendVerificationEmail(user, token) {
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  const link = `${base}/#/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({ to: user.email, subject: 'Verify your HotelPro account', text: `Hello ${user.name}, verify your email: ${link}`, html: `<p>Hello ${escapeHtml(user.name)},</p><p><a href="${link}">Verify your HotelPro account</a></p><p>This link expires in 24 hours.</p>` });
}

export async function sendBookingEmail(booking, guest, room, hotel) {
  const checkIn = new Date(booking.checkIn).toLocaleDateString('en-GB', { dateStyle: 'medium' });
  const checkOut = new Date(booking.checkOut).toLocaleDateString('en-GB', { dateStyle: 'medium' });
  return sendEmail({
    to: guest.email,
    subject: `Your stay at ${hotel?.name || 'HotelPro'} is confirmed`,
    text: `Hello ${guest.name}, your booking ${booking.reference} for ${room.name} is confirmed. Check in ${checkIn}, check out ${checkOut}. Total: ${booking.currency} ${booking.total}.`,
    html: `<p>Hello ${escapeHtml(guest.name)},</p><p>Your booking <strong>${escapeHtml(booking.reference)}</strong> is confirmed.</p><p>${escapeHtml(room.name)} · ${checkIn} – ${checkOut}</p><p>Total: ${escapeHtml(booking.currency)} ${booking.total}</p>`,
  });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
