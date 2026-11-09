const express = require('express');
const router  = express.Router();
const db      = require('../db');
const auth    = require('../middleware/auth');

// ── POST /api/request  (public) ──
router.post('/', (req, res) => {
  try {
    const { name, email, category, message } = req.body;

    if (!name?.trim() || !email?.trim() || !category?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Basic email shape check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    db.prepare(`
      INSERT INTO requests (name, email, category, message)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), email.trim().toLowerCase(), category.trim(), message.trim());

    res.status(201).json({ ok: true, message: 'Request received.' });
  } catch (err) {
    console.error('Request submit error:', err);
    res.status(500).json({ error: 'Could not save request.' });
  }
});

// ── GET /api/admin/requests  (admin only) ──
router.get('/', auth, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT id, name, email, category, message, created_at AS createdAt
      FROM requests
      ORDER BY created_at DESC
    `).all();

    res.json(rows);
  } catch (err) {
    console.error('Fetch requests error:', err);
    res.status(500).json({ error: 'Could not fetch requests.' });
  }
});

module.exports = router;
