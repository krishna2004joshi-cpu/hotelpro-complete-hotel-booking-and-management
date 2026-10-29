import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import Tooltip from '@mui/material/Tooltip';
import { io } from 'socket.io-client';
import { api, isStaticDemo } from './api.js';
import { setSession, signOut } from './store.js';
import { demoBookings, demoRooms, demoSummary, demoTasks, demoRequests, demoUsers } from './data/demo.js';
import { AdminScreen, BookingsScreen, BookingScreen, GuestScreen, OverviewScreen, ReportsScreen, RoomsScreen, StaffScreen } from './screens.jsx';

const navGroups = [
  { title: 'WORKSPACE', links: [{ to: '/', label: 'Overview', icon: '◫', roles: ['admin', 'staff'] }, { to: '/bookings', label: 'Reservations', icon: '▤', roles: ['admin', 'staff'] }, { to: '/rooms', label: 'Rooms & housekeeping', icon: '▦', roles: ['admin', 'staff'] }, { to: '/team', label: 'Guest experience', icon: '♡', roles: ['admin', 'staff'] }] },
  { title: 'INSIGHTS', links: [{ to: '/reports', label: 'Reports', icon: '⌁', roles: ['admin', 'staff'] }, { to: '/admin', label: 'Admin & properties', icon: '⚙', roles: ['admin'] }] },
  { title: 'YOUR STAY', links: [{ to: '/stay', label: 'My reservations', icon: '▤', roles: ['guest'] }, { to: '/book', label: 'Book a room', icon: '＋', roles: ['guest'] }] },
];

function App() {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const role = auth.user?.role || 'admin';
  const [bookings, setBookings] = useState(() => JSON.parse(localStorage.getItem('hotelpro.bookings') || 'null') || demoBookings);
  const [rooms, setRooms] = useState(demoRooms);
  const [tasks, setTasks] = useState(demoTasks);
  const [requests, setRequests] = useState(demoRequests);
  const [summary, setSummary] = useState(demoSummary);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!auth.token || auth.demo) return;
    api.get('/auth/me').then(({ data }) => dispatch(setSession({ user: data.data.user, token: auth.token, demo: false }))).catch(() => { dispatch(signOut()); toast.info('Your session expired. Please sign in again.'); });
  }, []);

  useEffect(() => {
    if (!auth.token || auth.demo) { setLive(false); return; }
    const headers = { Authorization: `Bearer ${auth.token}` };
    const tasksToFetch = [];
    if (['staff', 'admin'].includes(role)) {
      tasksToFetch.push(api.get('/bookings', { headers }).then((r) => setBookings(r.data.data.bookings)));
      tasksToFetch.push(api.get('/rooms', { headers }).then((r) => setRooms(r.data.data.rooms)));
    } else tasksToFetch.push(api.get('/bookings', { headers }).then((r) => setBookings(r.data.data.bookings)));
    if (role === 'admin') tasksToFetch.push(api.get('/admin/dashboard', { headers }).then((r) => setSummary(r.data.data)));
    if (['staff', 'admin'].includes(role)) {
      tasksToFetch.push(api.get('/staff/housekeeping', { headers }).then((r) => setTasks(r.data.data.tasks)));
      tasksToFetch.push(api.get('/staff/service-requests', { headers }).then((r) => setRequests(r.data.data.requests)));
    }
    Promise.allSettled(tasksToFetch).then((results) => { setLive(results.some((r) => r.status === 'fulfilled')); });
  }, [auth.token, auth.demo, role]);

  useEffect(() => {
    if (!auth.token || auth.demo) return undefined;
    const apiRoot = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    const socket = io(apiRoot, { auth: { token: auth.token } });
    socket.on('notification:new', (notification) => toast.info(`${notification.title}: ${notification.message}`));
    return () => socket.disconnect();
  }, [auth.token, auth.demo]);

  const visibleGroups = useMemo(() => navGroups.map((group) => ({ ...group, links: group.links.filter((link) => link.roles.includes(role)) })).filter((group) => group.links.length), [role]);
  const title = location.pathname === '/' ? 'Overview' : ({ '/bookings': 'Reservations', '/rooms': 'Rooms & housekeeping', '/team': 'Guest experience', '/reports': 'Reports', '/admin': 'Admin & properties', '/stay': 'My reservations', '/book': 'Find your stay', '/signin': 'Welcome to HotelPro' }[location.pathname] || 'HotelPro');
  const loginAs = (selectedRole) => { dispatch(setSession({ user: demoUsers[selectedRole], token: null, demo: true })); navigate(selectedRole === 'guest' ? '/book' : '/'); toast.success(`Demo opened as ${selectedRole}.`); };
  const onLogout = () => { dispatch(signOut()); navigate('/signin'); };
  const onBooking = (booking) => { const updated = [booking, ...bookings]; setBookings(updated); localStorage.setItem('hotelpro.bookings', JSON.stringify(updated)); };

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('/')}><span className="brand-mark">h</span><span>hotelpro<span className="brand-dot">.</span></span></button>
      <button className="property-switch"><span className="property-avatar">M</span><span className="property-copy"><b>Maison Aurore</b><small>Paris, France</small></span><span className="chevron">⌄</span></button>
      <div className="nav-scroll">{visibleGroups.map((group) => <div className="nav-group" key={group.title}><span className="nav-label">{group.title}</span>{group.links.map((link) => <button key={link.to} className={`nav-link ${location.pathname === link.to ? 'active' : ''}`} onClick={() => navigate(link.to)}><span className="nav-icon">{link.icon}</span>{link.label}{link.to === '/team' && <span className="nav-count">3</span>}</button>)}</div>)}</div>
      <div className="sidebar-bottom"><div className="help-card"><span className="help-spark">✳</span><b>Need a hand?</b><small>Our team is always here to help.</small><button onClick={() => toast.info('Contact support at support@hotelpro.local')}>Visit help centre <span>↗</span></button></div><button className="profile-button" onClick={() => navigate('/signin')}><span className="profile-avatar">{(auth.user?.name || 'M').slice(0, 1)}</span><span className="profile-copy"><b>{auth.user?.name || 'Morgan Ellis'}</b><small>{role === 'admin' ? 'Property admin' : role === 'staff' ? 'Hotel team' : 'Guest account'}</small></span><span className="more">···</span></button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="crumb"><span>HotelPro</span><span className="slash">/</span><b>{title}</b></div><div className="top-actions"><span className={`live-pill ${live ? 'connected' : 'demo'}`}><i />{live ? 'Connected' : 'Demo mode'}</span><Tooltip title="Notifications"><button className="icon-button" onClick={() => toast.info('You’re all caught up.')}>♧<span className="notification-dot" /></button></Tooltip><span className="top-divider" /><button className="top-profile" onClick={() => navigate('/signin')}><span className="profile-avatar small">{(auth.user?.name || 'M').slice(0, 1)}</span><span>{auth.user?.name || 'Morgan Ellis'}</span><span className="chevron">⌄</span></button></div></header>
      <div className="content-area">
        <Routes>
          <Route path="/" element={role === 'guest' ? <Navigate to="/stay" replace /> : <OverviewScreen summary={summary} bookings={bookings} rooms={rooms} onNavigate={navigate} />} />
          <Route path="/bookings" element={<RequireRole allowed={['staff', 'admin']}><BookingsScreen bookings={bookings} onUpdate={setBookings} role={role} live={live} /></RequireRole>} />
          <Route path="/rooms" element={<RequireRole allowed={['staff', 'admin']}><RoomsScreen rooms={rooms} tasks={tasks} setTasks={setTasks} /></RequireRole>} />
          <Route path="/team" element={<RequireRole allowed={['staff', 'admin']}><StaffScreen requests={requests} setRequests={setRequests} bookings={bookings} /></RequireRole>} />
          <Route path="/reports" element={<RequireRole allowed={['staff', 'admin']}><ReportsScreen summary={summary} bookings={bookings} /></RequireRole>} />
          <Route path="/admin" element={<RequireRole allowed={['admin']}><AdminScreen live={live} /></RequireRole>} />
          <Route path="/stay" element={<RequireRole allowed={['guest']}><GuestScreen bookings={bookings.filter((b) => b.guest?.email === auth.user?.email || auth.demo)} /></RequireRole>} />
          <Route path="/book" element={<BookingScreen rooms={rooms.length ? rooms : demoRooms} onBooking={onBooking} auth={auth} />} />
          <Route path="/signin" element={<SignIn onDemo={loginAs} />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancelled" element={<PaymentCancelled />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <footer className="footer"><span>© 2026 HotelPro · Calm operations, memorable stays</span><button onClick={onLogout}>{auth.user ? 'Sign out' : 'Switch demo role'}</button></footer>
    </main>
  </div>;
}

function SignIn({ onDemo }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [busy, setBusy] = useState(false);
  const update = (event) => setForm((value) => ({ ...value, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      if (isStaticDemo) throw new Error('Account sign-in and registration need a connected HotelPro API. Use the demo workspace below.');
      if (mode === 'register') {
        const { data } = await api.post('/auth/register', form);
        toast.success(data.data.message + (data.data.verificationToken ? ` Demo verification token: ${data.data.verificationToken}` : ''));
        setMode('login'); return;
      }
      const { data } = await api.post('/auth/login', form);
      dispatch(setSession({ ...data.data, demo: false })); navigate(data.data.user.role === 'guest' ? '/stay' : '/'); toast.success(`Welcome back, ${data.data.user.name.split(' ')[0]}.`);
    } catch (error) { toast.error(error.response?.data?.error?.message || 'Could not reach the HotelPro API. Try a demo workspace below.'); }
    finally { setBusy(false); }
  };
  return <div className="auth-wrap"><div className="auth-story"><span className="eyebrow">A BETTER WAY TO HOST</span><h1>Great stays start with a little more care.</h1><p>Keep the details in order, so you can focus on the people who make a place feel special.</p><div className="story-metric"><span className="story-stars">★★★★★</span><span>Trusted by thoughtful hospitality teams</span></div></div><div className="auth-panel"><div className="auth-tabs"><button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Sign in</button><button className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>Create account</button></div><h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2><p className="muted">{mode === 'login' ? 'Enter your details or open a guided demo.' : 'Start planning your next hotel stay.'}</p><form onSubmit={submit} className="auth-form">{mode === 'register' && <label>Full name<input name="name" value={form.name} onChange={update} required minLength="2" placeholder="Your name" /></label>}<label>Email address<input name="email" type="email" value={form.email} onChange={update} required placeholder="you@example.com" /></label><label>Password<input name="password" type="password" value={form.password} onChange={update} required minLength="10" placeholder="At least 10 characters" /></label><button className="primary-button wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in to HotelPro' : 'Create account'}<span>→</span></button></form><div className="demo-divider"><span>OR EXPLORE A DEMO</span></div><div className="demo-role-grid">{[['admin', 'Admin workspace'], ['staff', 'Hotel team'], ['guest', 'Guest booking']].map(([key, label]) => <button key={key} onClick={() => onDemo(key)}><b>{label}</b><span>Open demo →</span></button>)}</div></div></div>;
}

function RequireRole({ allowed, children }) {
  const user = useSelector((state) => state.auth.user);
  if (!user) return <Navigate to="/signin" replace />;
  if (!allowed.includes(user.role)) return <Navigate to={user.role === 'guest' ? '/stay' : '/'} replace />;
  return children;
}

function PaymentSuccess() { const navigate = useNavigate(); return <div className="empty-state"><span className="success-icon">✓</span><h2>Payment received</h2><p>Your reservation is now being confirmed. The hotel will send your booking details by email.</p><button className="primary-button" onClick={() => navigate('/stay')}>View my reservations →</button></div>; }
function PaymentCancelled() { const navigate = useNavigate(); return <div className="empty-state"><span className="soft-icon">↩</span><h2>Checkout paused</h2><p>Your booking is still saved. You can return to it from your reservations.</p><button className="primary-button" onClick={() => navigate('/stay')}>Back to my reservations →</button></div>; }
function VerifyEmail() { const [message, setMessage] = useState('Verifying your email…'); useEffect(() => { const token = new URLSearchParams(location.hash.split('?')[1] || '').get('token'); if (token) api.post('/auth/verify-email', { token }).then(() => setMessage('Email verified. You can sign in now.')).catch((e) => setMessage(e.response?.data?.error?.message || 'Could not verify this link.')); else setMessage('No verification token was found.'); }, []); return <div className="empty-state"><span className="soft-icon">✉</span><h2>Email verification</h2><p>{message}</p></div>; }

export default App;
