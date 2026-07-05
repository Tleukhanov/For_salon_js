const { Router } = require('express');
const { getDb, saveDb } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = Router();

function queryAll(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

router.post('/login', (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Пароль обязателен' });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    req.session.isAdmin = true;
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/admin/login:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/logout', (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка при выходе' });
      }
      res.json({ success: true });
    });
  } catch (err) {
    console.error('POST /api/admin/logout:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.use(requireAdmin);

router.get('/masters', (req, res) => {
  try {
    const masters = queryAll('SELECT id, name, active FROM masters');
    res.json(masters);
  } catch (err) {
    console.error('GET /api/admin/masters:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/masters', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Имя мастера обязательно' });
    }

    const db = getDb();
    db.run('INSERT INTO masters (name, active) VALUES (?, 1)', [name.trim()]);
    saveDb();

    const idResult = db.exec('SELECT last_insert_rowid()');
    const id = idResult[0].values[0][0];

    res.status(201).json({ id, name: name.trim(), active: 1 });
  } catch (err) {
    console.error('POST /api/admin/masters:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/masters/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = queryOne('SELECT id FROM masters WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const db = getDb();
    db.run('UPDATE masters SET active = 0 WHERE id = ?', [id]);
    saveDb();

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/masters:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/bookings', (req, res) => {
  try {
    const bookings = queryAll(`
      SELECT
        b.id,
        b.master_id,
        m.name AS master_name,
        b.service_id,
        s.name AS service_name,
        s.price,
        b.client_name,
        b.client_phone,
        b.booking_date,
        b.booking_time,
        b.created_at
      FROM bookings b
      JOIN masters m ON m.id = b.master_id
      JOIN services s ON s.id = b.service_id
      ORDER BY b.booking_date, b.booking_time
    `);

    res.json(bookings);
  } catch (err) {
    console.error('GET /api/admin/bookings:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/unavailability', (req, res) => {
  try {
    const { master_id, date, start_time, end_time, reason } = req.body;

    if (!master_id || !date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Поля master_id, date, start_time, end_time обязательны' });
    }

    const master = queryOne('SELECT id FROM masters WHERE id = ?', [master_id]);
    if (!master) {
      return res.status(400).json({ error: 'Мастер не найден' });
    }

    const db = getDb();
    db.run(
      'INSERT INTO unavailability (master_id, date, start_time, end_time, reason) VALUES (?, ?, ?, ?, ?)',
      [master_id, date, start_time, end_time, reason || null]
    );
    saveDb();

    const idResult = db.exec('SELECT last_insert_rowid()');
    const id = idResult[0].values[0][0];

    res.status(201).json({ id, master_id: parseInt(master_id), date, start_time, end_time, reason: reason || null });
  } catch (err) {
    console.error('POST /api/admin/unavailability:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/unavailability', (req, res) => {
  try {
    const { master_id } = req.query;

    if (!master_id) {
      return res.status(400).json({ error: 'Параметр master_id обязателен' });
    }

    const blocks = queryAll(
      'SELECT id, master_id, date, start_time, end_time, reason FROM unavailability WHERE master_id = ? ORDER BY date, start_time',
      [master_id]
    );

    res.json(blocks);
  } catch (err) {
    console.error('GET /api/admin/unavailability:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/unavailability/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = queryOne('SELECT id FROM unavailability WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Блокировка не найдена' });
    }

    const db = getDb();
    db.run('DELETE FROM unavailability WHERE id = ?', [id]);
    saveDb();

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/unavailability:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
