const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'nexline.db');
const db = new Database(DB_PATH);

// WAL mode = faster writes, safe concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── TABLES ──

db.exec(`
  CREATE TABLE IF NOT EXISTS visits (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    ts        INTEGER NOT NULL,          -- Unix ms timestamp
    ip        TEXT                       -- optional, for dedup
  );

  CREATE TABLE IF NOT EXISTS requests (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL,
    category   TEXT    NOT NULL,
    message    TEXT    NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL,
    product    TEXT    NOT NULL,
    message    TEXT    NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  );
`);

module.exports = db;
