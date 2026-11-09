const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');

// ── POST /api/visit  (called silently on every page load) ──
router.post('/', (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
            || req.socket.remoteAddress
            || 'unknown';

    const ts = Date.now();

    db.prepare(`INSERT INTO visits (ts, ip) VALUES (?, ?)`).run(ts, ip);

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Visit log error:', err);
    res.status(500).json({ error: 'Could not log visit.' });
  }
});

// ── GET /api/admin/stats  (admin only) ──
router.get('/stats', auth, (req, res) => {
  try {
    const now       = Date.now();
    const msPerDay  = 86_400_000;

    const startOfToday     = new Date(); startOfToday.setHours(0,0,0,0);
    const startOfYesterday = new Date(startOfToday - msPerDay);
    const startOfWeek      = new Date(now - 7  * msPerDay);
    const startOfMonth     = new Date(now - 30 * msPerDay);

    const count = (from, to) => {
      const row = db.prepare(
        `SELECT COUNT(*) AS n FROM visits WHERE ts >= ? AND ts < ?`
      ).get(from, to);
      return row.n;
    };

    const total = db.prepare(`SELECT COUNT(*) AS n FROM visits`).get().n;

    res.json({
      today:     count(startOfToday.getTime(),     now + 1),
      yesterday: count(startOfYesterday.getTime(), startOfToday.getTime()),
      week:      count(startOfWeek.getTime(),       now + 1),
      month:     count(startOfMonth.getTime(),      now + 1),
      total,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Could not fetch stats.' });
  }
});

module.exports = router;
