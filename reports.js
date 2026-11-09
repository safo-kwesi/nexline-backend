const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');

// ── POST /api/report  (public) ──
router.post('/', (req, res) => {
  try {
    const { name, email, product, message } = req.body;

    if (!name?.trim() || !email?.trim() || !product?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    db.prepare(`
      INSERT INTO reports (name, email, product, message)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), email.trim().toLowerCase(), product.trim(), message.trim());

    res.status(201).json({ ok: true, message: 'Report received.' });
  } catch (err) {
    console.error('Report submit error:', err);
    res.status(500).json({ error: 'Could not save report.' });
  }
});

// ── GET /api/admin/reports  (admin only) ──
router.get('/', auth, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, name, email, product, message, created_at AS createdAt
      FROM reports
      ORDER BY created_at DESC
    `).all();

    res.json(rows);
  } catch (err) {
    console.error('Fetch reports error:', err);
    res.status(500).json({ error: 'Could not fetch reports.' });
  }
});

module.exports = router;
