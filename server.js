require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');

const visitsRouter   = require('./routes/visits');
const requestsRouter = require('./routes/requests');
const reportsRouter  = require('./routes/reports');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──
// Allows your Vercel frontend + local dev
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (Render health checks, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-pw'],
}));

app.options('*', cors()); // pre-flight for all routes

// ── BODY PARSING ──
app.use(express.json({ limit: '20kb' }));

// ── RATE LIMITING ──
// Public submission endpoints: 10 requests per 15 min per IP
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please try again later.' },
});

// Visit logging: 60 per 15 min (page refreshes)
const visitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── ROUTES ──
app.post('/api/visit',   visitLimiter,  visitsRouter);
app.get('/api/admin/stats',             visitsRouter);   // stats sub-route

app.post('/api/request', submitLimiter, requestsRouter);
app.get('/api/admin/requests',          requestsRouter);

app.post('/api/report',  submitLimiter, reportsRouter);
app.get('/api/admin/reports',           reportsRouter);

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// ── GLOBAL ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── START ──
app.listen(PORT, () => {
  console.log(`✅  Nexline API running on port ${PORT}`);
});
