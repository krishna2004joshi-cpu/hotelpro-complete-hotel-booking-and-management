import { configureStore, createSlice } from '@reduxjs/toolkit';
const saved = (() => { try { return JSON.parse(localStorage.getItem('hotelpro.session') || 'null'); } catch { return null; } })();
const authSlice = createSlice({
  name: 'auth', initialState: saved || { user: null, token: null, demo: false },
  reducers: {
    setSession(state, action) { Object.assign(state, action.payload); localStorage.setItem('hotelpro.session', JSON.stringify(state)); },
    signOut(state) { state.user = null; state.token = null; state.demo = false; localStorage.removeItem('hotelpro.session'); },
  },
});
export const { setSession, signOut } = authSlice.actions;
export const store = configureStore({ reducer: { auth: authSlice.reducer } });
