import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/hotelpro-complete-hotel-booking-and-management/' : '/',
  server: { port: 5173 },
});
