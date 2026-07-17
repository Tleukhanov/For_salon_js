const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'salon.db');
const DATABASE_URL = process.env.DATABASE_URL;

let pgPool = null;
let sqlDb = null;
let isPg = false;

/* ===================== INIT ===================== */

async function initDb() {
  if (pgPool || sqlDb) return;

  if (DATABASE_URL) {
    console.log('Подключение к PostgreSQL...');
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
    });
    isPg = true;
    await pgPool.query('SELECT 1');
    await runMigrationsPg();
    console.log('PostgreSQL подключена.');
  } else {
    console.log('SQLite fallback (локальная разработка)...');
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      sqlDb = new SQL.Database(buffer);
    } else {
      sqlDb = new SQL.Database();
    }
    sqlDb.run('PRAGMA foreign_keys = ON');
    isPg = false;
    createTablesSqlite();
    saveDb();
  }
}

/* ===================== MIGRATIONS (PG) ===================== */

async function runMigrationsPg() {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;

  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const applied = await pgPool.query('SELECT name FROM _migrations ORDER BY id');
  const appliedSet = new Set(applied.rows.map(r => r.name));

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (appliedSet.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
      await client.query('COMMIT');
      console.log('Миграция применена:', file);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Ошибка миграции', file + ':', err.message);
      throw err;
    } finally {
      client.release();
    }
  }
}

/* ===================== TABLES (SQLITE) ===================== */

function createTablesSqlite() {
  sqlDb.run(`CREATE TABLE IF NOT EXISTS masters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  )`);
  sqlDb.run(`CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL
  )`);
  sqlDb.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    cancel_token TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(master_id, booking_date, booking_time)
  )`);
  sqlDb.run(`CREATE TABLE IF NOT EXISTS unavailability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    reason TEXT
  )`);
}

/* ===================== SAVE (SQLITE) ===================== */

function saveDb() {
  if (isPg || !sqlDb) return;
  try {
    const data = sqlDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (err) {
    console.error('Ошибка сохранения SQLite:', err.message);
  }
}

/* ===================== QUERY HELPERS ===================== */

function convertParams(sql) {
  return sql.replace(/\$\d+/g, () => '?');
}

function queryAllSqlite(sql, params = []) {
  const converted = convertParams(sql);
  const stmt = sqlDb.prepare(converted);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function runSqlite(sql, params = []) {
  let converted = convertParams(sql);
  converted = converted.replace(/\s+RETURNING\s+\w+/gi, '');
  sqlDb.run(converted, params);
  const idRes = sqlDb.exec('SELECT last_insert_rowid() AS id');
  const id = idRes.length > 0 ? idRes[0].values[0][0] : null;
  saveDb();
  return { changes: sqlDb.getRowsModified(), rows: id !== null ? [{ id }] : [] };
}

async function queryAll(sql, params = []) {
  if (isPg) {
    const res = await pgPool.query(sql, params);
    return res.rows;
  }
  return queryAllSqlite(sql, params);
}

async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function runSql(sql, params = []) {
  if (isPg) {
    const res = await pgPool.query(sql, params);
    return { changes: res.rowCount, rows: res.rows };
  }
  return runSqlite(sql, params);
}

/* ===================== EXPORTS ===================== */

module.exports = { initDb, saveDb, queryAll, queryOne, runSql, isPg: () => isPg };
