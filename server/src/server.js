import 'dotenv/config';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { Server as SocketServer } from 'socket.io';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import User from './models/User.js';

const port = Number(process.env.PORT || 5000);
await connectDatabase();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: (process.env.CLIENT_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((item) => item.trim()), credentials: true },
});
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required.'));
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'hotelpro-api', audience: 'hotelpro-client' });
    const user = await User.findById(payload.sub).select('_id isActive');
    if (!user?.isActive) return next(new Error('Session expired.'));
    socket.userId = String(user._id);
    next();
  } catch { next(new Error('Session expired.')); }
});
io.on('connection', (socket) => socket.join(socket.userId));
globalThis.hotelproIO = io;
server.listen(port, () => console.info(`HotelPro API listening on port ${port}`));

async function shutdown(signal) {
  console.info(`${signal} received; closing HotelPro API.`);
  io.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
