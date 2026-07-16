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

function getLastInsertId() {
  const rows = queryAll('SELECT last_insert_rowid() AS id');
  return rows.length > 0 ? rows[0].id : null;
}

function getTodayStr() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
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

    const trimmed = name.trim();
    if (trimmed.length > 100) {
      return res.status(400).json({ error: 'Имя слишком длинное' });
    }

    const db = getDb();
    db.run('INSERT INTO masters (name, active) VALUES (?, 1)', [trimmed]);
    const id = getLastInsertId();
    saveDb();

    res.status(201).json({ id, name: trimmed, active: 1 });
  } catch (err) {
    console.error('POST /api/admin/masters:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/masters/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Имя мастера обязательно' });
    }

    const trimmed = name.trim();
    if (trimmed.length > 100) {
      return res.status(400).json({ error: 'Имя слишком длинное' });
    }

    const master = queryOne('SELECT id FROM masters WHERE id = ?', [id]);
    if (!master) {
      return res.status(404).json({ error: 'Мастер не найден' });
    }

    const db = getDb();
    db.run('UPDATE masters SET name = ? WHERE id = ?', [trimmed, id]);
    saveDb();

    res.json({ success: true, name: trimmed });
  } catch (err) {
    console.error('PUT /api/admin/masters:', err.message);
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

router.get('/services', (req, res) => {
  try {
    const services = queryAll('SELECT id, name, price, duration_minutes FROM services ORDER BY id');
    res.json(services);
  } catch (err) {
    console.error('GET /api/admin/services:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/services', (req, res) => {
  try {
    const { name, price, duration_minutes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Название услуги обязательно' });
    }

    const trimmed = name.trim();
    if (trimmed.length > 200) {
      return res.status(400).json({ error: 'Название слишком длинное' });
    }

    const priceInt = parseInt(price, 10);
    if (isNaN(priceInt) || priceInt < 0) {
      return res.status(400).json({ error: 'Цена должна быть целым числом >= 0' });
    }

    const durInt = parseInt(duration_minutes, 10);
    if (isNaN(durInt) || durInt < 15 || durInt > 480) {
      return res.status(400).json({ error: 'Длительность должна быть от 15 до 480 минут' });
    }

    const db = getDb();
    db.run('INSERT INTO services (name, price, duration_minutes) VALUES (?, ?, ?)', [trimmed, priceInt, durInt]);
    const id = getLastInsertId();
    saveDb();

    res.status(201).json({ id, name: trimmed, price: priceInt, duration_minutes: durInt });
  } catch (err) {
    console.error('POST /api/admin/services:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/services/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, duration_minutes } = req.body;

    const service = queryOne('SELECT id FROM services WHERE id = ?', [id]);
    if (!service) {
      return res.status(404).json({ error: 'Услуга не найдена' });
    }

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Название услуги обязательно' });
      }
      if (name.trim().length > 200) {
        return res.status(400).json({ error: 'Название слишком длинное' });
      }
    }

    if (price !== undefined) {
      const priceInt = parseInt(price, 10);
      if (isNaN(priceInt) || priceInt < 0) {
        return res.status(400).json({ error: 'Цена должна быть целым числом >= 0' });
      }
    }

    if (duration_minutes !== undefined) {
      const durInt = parseInt(duration_minutes, 10);
      if (isNaN(durInt) || durInt < 15 || durInt > 480) {
        return res.status(400).json({ error: 'Длительность должна быть от 15 до 480 минут' });
      }
    }

    const current = queryOne('SELECT name, price, duration_minutes FROM services WHERE id = ?', [id]);
    const newName = name !== undefined ? name.trim() : current.name;
    const newPrice = price !== undefined ? parseInt(price, 10) : current.price;
    const newDur = duration_minutes !== undefined ? parseInt(duration_minutes, 10) : current.duration_minutes;

    const db = getDb();
    db.run('UPDATE services SET name = ?, price = ?, duration_minutes = ? WHERE id = ?', [newName, newPrice, newDur, id]);
    saveDb();

    res.json({ success: true, id: parseInt(id), name: newName, price: newPrice, duration_minutes: newDur });
  } catch (err) {
    console.error('PUT /api/admin/services:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/services/:id', (req, res) => {
  try {
    const { id } = req.params;

    const service = queryOne('SELECT id FROM services WHERE id = ?', [id]);
    if (!service) {
      return res.status(404).json({ error: 'Услуга не найдена' });
    }

    const bookings = queryOne('SELECT id FROM bookings WHERE service_id = ? LIMIT 1', [id]);
    if (bookings) {
      return res.status(409).json({ error: 'Невозможно удалить услугу: она есть в записях клиентов. Отредактируйте её вместо удаления.' });
    }

    const db = getDb();
    db.run('DELETE FROM services WHERE id = ?', [id]);
    saveDb();

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/services:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/bookings', (req, res) => {
  try {
    const { filter } = req.query;
    const today = getTodayStr();

    let whereClause = '';
    if (filter === 'upcoming') {
      whereClause = `WHERE b.booking_date >= '${today}'`;
    } else if (filter === 'history') {
      whereClause = `WHERE b.booking_date < '${today}'`;
    }

    const bookings = queryAll(`
      SELECT
        b.id,
        b.master_id,
        m.name AS master_name,
        b.service_id,
        s.name AS service_name,
        s.price,
        s.duration_minutes,
        b.client_name,
        b.client_phone,
        b.booking_date,
        b.booking_time,
        b.created_at
      FROM bookings b
      JOIN masters m ON m.id = b.master_id
      JOIN services s ON s.id = b.service_id
      ${whereClause}
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
    const id = getLastInsertId();
    saveDb();

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
