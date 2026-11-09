const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');

// POST /api/visit
router.post('/', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
            || req.socket.remoteAddress || 'unknown';
    await db.run_p(`INSERT INTO visits (ts, ip) VALUES (?, ?)`, [Date.now(), ip]);
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Visit log error:', err);
    res.status(500).json({ error: 'Could not log visit.' });
  }
});

// GET /api/admin/stats
router.get('/stats', auth, async (req, res) => {
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
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Could not fetch stats.' });
  }
});

module.exports = router;
