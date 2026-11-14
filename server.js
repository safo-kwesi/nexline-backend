require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const jwt       = require('jsonwebtoken');
const { visits, requests, reports } = require('./db');
const auth      = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──
app.use(cors({
  origin: (origin, cb) => {
    if (
      !origin ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      (process.env.FRONTEND_ORIGIN && origin === process.env.FRONTEND_ORIGIN)
    ) return cb(null, true);
    cb(new Error('CORS blocked: ' + origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// ── BODY ──
app.use(express.json({ limit: '20kb' }));

// ── RATE LIMITERS ──
const submitLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const visitLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });
const loginLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

// ── HEALTH ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// ── POST /api/admin/login ──
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { password } = req.body;
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// ── POST /api/visit ──
app.post('/api/visit', visitLimiter, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
            || req.socket.remoteAddress || 'unknown';
    await visits.insertAsync({ ts: Date.now(), ip });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Visit error:', err);
    res.status(500).json({ error: 'Could not log visit.' });
  }
});

// ── GET /api/admin/stats ──
app.get('/api/admin/stats', auth, async (req, res) => {
  try {
    const now              = Date.now();
    const msDay            = 86_400_000;
    const startOfToday     = new Date(); startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday - msDay);
    const startOfWeek      = new Date(now - 7  * msDay);
    const startOfMonth     = new Date(now - 30 * msDay);
    const count = (from, to) => visits.countAsync({ ts: { $gte: from, $lt: to } });
    res.json({
      today:     await count(startOfToday.getTime(),     now + 1),
      yesterday: await count(startOfYesterday.getTime(), startOfToday.getTime()),
      week:      await count(startOfWeek.getTime(),       now + 1),
      month:     await count(startOfMonth.getTime(),      now + 1),
      total:     await visits.countAsync({}),
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Could not fetch stats.' });
  }
});

// ── POST /api/request ──
app.post('/api/request', submitLimiter, async (req, res) => {
  try {
    const { name, email, category, message } = req.body;
    if (!name?.trim() || !email?.trim() || !category?.trim() || !message?.trim())
      return res.status(400).json({ error: 'All fields are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email.' });
    await requests.insertAsync({ name: name.trim(), email: email.trim().toLowerCase(), category: category.trim(), message: message.trim(), createdAt: Date.now() });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Request error:', err);
    res.status(500).json({ error: 'Could not save request.' });
  }
});

// ── GET /api/admin/requests ──
app.get('/api/admin/requests', auth, async (req, res) => {
  try {
    const rows = await requests.findAsync({}).sort({ createdAt: -1 });
    res.json(rows);
  } catch (err) {
    console.error('Fetch requests error:', err);
    res.status(500).json({ error: 'Could not fetch requests.' });
  }
});

// ── POST /api/report ──
app.post('/api/report', submitLimiter, async (req, res) => {
  try {
    const { name, email, product, message } = req.body;
    if (!name?.trim() || !email?.trim() || !product?.trim() || !message?.trim())
      return res.status(400).json({ error: 'All fields are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email.' });
    await reports.insertAsync({ name: name.trim(), email: email.trim().toLowerCase(), product: product.trim(), message: message.trim(), createdAt: Date.now() });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Could not save report.' });
  }
});

// ── GET /api/admin/reports ──
app.get('/api/admin/reports', auth, async (req, res) => {
  try {
    const rows = await reports.findAsync({}).sort({ createdAt: -1 });
    res.json(rows);
  } catch (err) {
    console.error('Fetch reports error:', err);
    res.status(500).json({ error: 'Could not fetch reports.' });
  }
});

// ── 404 ──
app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

// ── ERROR ──
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── START ──
app.listen(PORT, () => console.log(`✅ Nexline API running on port ${PORT}`));
