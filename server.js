require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');

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
    console.warn('CORS blocked:', origin);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-pw'],
}));
app.options('*', cors());

// ── BODY PARSING ──
app.use(express.json({ limit: '20kb' }));

// ── RATE LIMITERS ──
const submitLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const visitLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 60 });

// ── DB ──
const db   = require('./db');
const auth = require('./middleware/auth');

// ── HEALTH ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// ── VISIT ──
app.post('/api/visit', visitLimiter, async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
            || req.socket.remoteAddress || 'unknown';
    await db.run_p(`INSERT INTO visits (ts, ip) VALUES (?, ?)`, [Date.now(), ip]);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not log visit.' });
  }
});

// ── STATS (admin) ──
app.get('/api/admin/stats', auth, async (req, res) => {
  try {
    const now              = Date.now();
    const msDay            = 86_400_000;
    const startOfToday     = new Date(); startOfToday.setHours(0,0,0,0);
    const startOfYesterday = new Date(startOfToday - msDay);
    const startOfWeek      = new Date(now - 7  * msDay);
    const startOfMonth     = new Date(now - 30 * msDay);

    const count = async (from, to) => {
      const row = await db.get_p(`SELECT COUNT(*) AS n FROM visits WHERE ts >= ? AND ts < ?`, [from, to]);
      return row.n;
    };
    const totalRow = await db.get_p(`SELECT COUNT(*) AS n FROM visits`);

    res.json({
      today:     await count(startOfToday.getTime(),     now + 1),
      yesterday: await count(startOfYesterday.getTime(), startOfToday.getTime()),
      week:      await count(startOfWeek.getTime(),       now + 1),
      month:     await count(startOfMonth.getTime(),      now + 1),
      total:     totalRow.n,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch stats.' });
  }
});

// ── REQUEST ──
app.post('/api/request', submitLimiter, async (req, res) => {
  try {
    const { name, email, category, message } = req.body;
    if (!name?.trim() || !email?.trim() || !category?.trim() || !message?.trim())
      return res.status(400).json({ error: 'All fields are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email.' });
    await db.run_p(
      `INSERT INTO requests (name, email, category, message) VALUES (?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), category.trim(), message.trim()]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save request.' });
  }
});

// ── REQUESTS (admin) ──
app.get('/api/admin/requests', auth, async (req, res) => {
  try {
    const rows = await db.all_p(
      `SELECT id, name, email, category, message, created_at AS createdAt FROM requests ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch requests.' });
  }
});

// ── REPORT ──
app.post('/api/report', submitLimiter, async (req, res) => {
  try {
    const { name, email, product, message } = req.body;
    if (!name?.trim() || !email?.trim() || !product?.trim() || !message?.trim())
      return res.status(400).json({ error: 'All fields are required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Invalid email.' });
    await db.run_p(
      `INSERT INTO reports (name, email, product, message) VALUES (?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), product.trim(), message.trim()]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save report.' });
  }
});

// ── REPORTS (admin) ──
app.get('/api/admin/reports', auth, async (req, res) => {
  try {
    const rows = await db.all_p(
      `SELECT id, name, email, product, message, created_at AS createdAt FROM reports ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
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
