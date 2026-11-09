const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const DB_PATH = path.join(__dirname, 'nexline.db');
const db      = new sqlite3.Database(DB_PATH);

// Promisified helpers so routes stay clean
db.run_p  = (sql, params = []) => new Promise((res, rej) =>
  db.run(sql, params, function (err) { err ? rej(err) : res({ lastID: this.lastID, changes: this.changes }); })
);
db.all_p  = (sql, params = []) => new Promise((res, rej) =>
  db.all(sql, params, (err, rows) => err ? rej(err) : res(rows))
);
db.get_p  = (sql, params = []) => new Promise((res, rej) =>
  db.get(sql, params, (err, row) => err ? rej(err) : res(row))
);

// ── CREATE TABLES ──
db.serialize(() => {
  db.run(`PRAGMA journal_mode = WAL`);
  db.run(`PRAGMA foreign_keys = ON`);

  db.run(`
    CREATE TABLE IF NOT EXISTS visits (
      id  INTEGER PRIMARY KEY AUTOINCREMENT,
      ts  INTEGER NOT NULL,
      ip  TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL,
      category   TEXT    NOT NULL,
      message    TEXT    NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      email      TEXT    NOT NULL,
      product    TEXT    NOT NULL,
      message    TEXT    NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
    )
  `);
});

module.exports = db;
