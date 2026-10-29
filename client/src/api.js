import axios from 'axios';
import { store } from './store.js';
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const api = axios.create({ baseURL, timeout: 10000 });
api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const isStaticDemo = import.meta.env.VITE_DEMO_MODE === 'true';
