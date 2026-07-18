const { Router } = require('express');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = Router();

function getTodayStr() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

function boolVal(v) { return db.isPg() ? v : (v ? 1 : 0); }
function timeCol(c) { return db.isPg() ? `${c}::text` : c; }
function dateCol(c) { return db.isPg() ? `${c}::text` : c; }

router.post('/login', (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Пароль обязателен' });
    if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Неверный пароль' });
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
      if (err) return res.status(500).json({ error: 'Ошибка при выходе' });
      res.json({ success: true });
    });
  } catch (err) {
    console.error('POST /api/admin/logout:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.use(requireAdmin);

/* ===================== MASTERS ===================== */

router.get('/masters', async (req, res) => {
  try {
    const masters = await db.queryAll('SELECT id, name, active, avatar_url, description, speciality FROM masters');
    res.json(masters);
  } catch (err) {
    console.error('GET /api/admin/masters:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/masters', async (req, res) => {
  try {
    const { name, avatar_url, description, speciality } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Имя мастера обязательно' });
    const trimmed = name.trim();
    if (trimmed.length > 100) return res.status(400).json({ error: 'Имя слишком длинное' });

    const result = await db.runSql(
      'INSERT INTO masters (name, active, avatar_url, description, speciality) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [trimmed, boolVal(true), avatar_url || '', description || '', speciality || '']
    );
    const id = result.rows && result.rows[0] ? result.rows[0].id : null;
    res.status(201).json({ id, name: trimmed, active: true, avatar_url: avatar_url || '', description: description || '', speciality: speciality || '' });
  } catch (err) {
    console.error('POST /api/admin/masters:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/masters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, avatar_url, description, speciality } = req.body;
    if (name !== undefined) {
      if (!name || !name.trim()) return res.status(400).json({ error: 'Имя мастера обязательно' });
      if (name.trim().length > 100) return res.status(400).json({ error: 'Имя слишком длинное' });
    }

    const master = await db.queryOne('SELECT id, name, avatar_url, description, speciality FROM masters WHERE id = $1', [id]);
    if (!master) return res.status(404).json({ error: 'Мастер не найден' });

    const newName = name !== undefined ? name.trim() : master.name;
    const newAvatar = avatar_url !== undefined ? avatar_url : master.avatar_url;
    const newDesc = description !== undefined ? description : master.description;
    const newSpec = speciality !== undefined ? speciality : master.speciality;

    await db.runSql('UPDATE masters SET name = $1, avatar_url = $2, description = $3, speciality = $4 WHERE id = $5',
      [newName, newAvatar || '', newDesc || '', newSpec || '', id]);
    res.json({ success: true, id: parseInt(id), name: newName, avatar_url: newAvatar || '', description: newDesc || '', speciality: newSpec || '' });
  } catch (err) {
    console.error('PUT /api/admin/masters:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/masters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.queryOne('SELECT id FROM masters WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ error: 'Мастер не найден' });

    await db.runSql('UPDATE masters SET active = $1 WHERE id = $2', [boolVal(false), id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/masters:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* ===================== SERVICES ===================== */

router.get('/services', async (req, res) => {
  try {
    const services = await db.queryAll('SELECT id, name, price, duration_minutes, icon, description FROM services ORDER BY id');
    res.json(services);
  } catch (err) {
    console.error('GET /api/admin/services:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/services', async (req, res) => {
  try {
    const { name, price, duration_minutes, icon, description } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Название услуги обязательно' });
    const trimmed = name.trim();
    if (trimmed.length > 200) return res.status(400).json({ error: 'Название слишком длинное' });

    const priceInt = parseInt(price, 10);
    if (isNaN(priceInt) || priceInt < 0) return res.status(400).json({ error: 'Цена должна быть целым числом >= 0' });

    const durInt = parseInt(duration_minutes, 10);
    if (isNaN(durInt) || durInt < 15 || durInt > 480) return res.status(400).json({ error: 'Длительность должна быть от 15 до 480 минут' });

    const result = await db.runSql(
      'INSERT INTO services (name, price, duration_minutes, icon, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [trimmed, priceInt, durInt, icon || '', description || '']
    );
    const id = result.rows && result.rows[0] ? result.rows[0].id : null;
    res.status(201).json({ id, name: trimmed, price: priceInt, duration_minutes: durInt, icon: icon || '', description: description || '' });
  } catch (err) {
    console.error('POST /api/admin/services:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, duration_minutes, icon, description } = req.body;

    const service = await db.queryOne('SELECT id FROM services WHERE id = $1', [id]);
    if (!service) return res.status(404).json({ error: 'Услуга не найдена' });

    if (name !== undefined) {
      if (!name || !name.trim()) return res.status(400).json({ error: 'Название услуги обязательно' });
      if (name.trim().length > 200) return res.status(400).json({ error: 'Название слишком длинное' });
    }
    if (price !== undefined) {
      const p = parseInt(price, 10);
      if (isNaN(p) || p < 0) return res.status(400).json({ error: 'Цена должна быть целым числом >= 0' });
    }
    if (duration_minutes !== undefined) {
      const d = parseInt(duration_minutes, 10);
      if (isNaN(d) || d < 15 || d > 480) return res.status(400).json({ error: 'Длительность должна быть от 15 до 480 минут' });
    }

    const current = await db.queryOne('SELECT name, price, duration_minutes, icon, description FROM services WHERE id = $1', [id]);
    const newName = name !== undefined ? name.trim() : current.name;
    const newPrice = price !== undefined ? parseInt(price, 10) : current.price;
    const newDur = duration_minutes !== undefined ? parseInt(duration_minutes, 10) : current.duration_minutes;
    const newIcon = icon !== undefined ? icon : current.icon;
    const newDesc = description !== undefined ? description : current.description;

    await db.runSql('UPDATE services SET name = $1, price = $2, duration_minutes = $3, icon = $4, description = $5 WHERE id = $6',
      [newName, newPrice, newDur, newIcon || '', newDesc || '', id]);
    res.json({ success: true, id: parseInt(id), name: newName, price: newPrice, duration_minutes: newDur, icon: newIcon || '', description: newDesc || '' });
  } catch (err) {
    console.error('PUT /api/admin/services:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await db.queryOne('SELECT id FROM services WHERE id = $1', [id]);
    if (!service) return res.status(404).json({ error: 'Услуга не найдена' });

    const bookings = await db.queryOne('SELECT id FROM bookings WHERE service_id = $1 LIMIT 1', [id]);
    if (bookings) {
      return res.status(409).json({ error: 'Невозможно удалить услугу: она есть в записях клиентов. Отредактируйте её вместо удаления.' });
    }

    await db.runSql('DELETE FROM services WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/services:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* ===================== BOOKINGS ===================== */

router.get('/bookings', async (req, res) => {
  try {
    const { filter } = req.query;
    const today = getTodayStr();

    let whereClause = '';
    let params = [];
    if (filter === 'upcoming') {
      whereClause = 'WHERE b.booking_date >= $1';
      params = [today];
    } else if (filter === 'history') {
      whereClause = 'WHERE b.booking_date < $1';
      params = [today];
    }

    const bookings = await db.queryAll(`
      SELECT
        b.id, b.master_id, m.name AS master_name,
        b.service_id, s.name AS service_name, s.price, s.duration_minutes,
        b.client_name, b.client_phone,
        ${dateCol('b.booking_date')} AS booking_date,
        ${timeCol('b.booking_time')} AS booking_time,
        ${timeCol('b.created_at')} AS created_at
      FROM bookings b
      JOIN masters m ON m.id = b.master_id
      JOIN services s ON s.id = b.service_id
      ${whereClause}
      ORDER BY b.booking_date, b.booking_time
    `, params);

    res.json(bookings);
  } catch (err) {
    console.error('GET /api/admin/bookings:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/* ===================== UNAVAILABILITY ===================== */

router.post('/unavailability', async (req, res) => {
  try {
    const { master_id, date, start_time, end_time, reason } = req.body;
    if (!master_id || !date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Поля master_id, date, start_time, end_time обязательны' });
    }

    const master = await db.queryOne('SELECT id FROM masters WHERE id = $1', [master_id]);
    if (!master) return res.status(400).json({ error: 'Мастер не найден' });

    const result = await db.runSql(
      'INSERT INTO unavailability (master_id, date, start_time, end_time, reason) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [master_id, date, start_time, end_time, reason || null]
    );
    const id = result.rows && result.rows[0] ? result.rows[0].id : null;
    res.status(201).json({ id, master_id: parseInt(master_id), date, start_time, end_time, reason: reason || null });
  } catch (err) {
    console.error('POST /api/admin/unavailability:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/unavailability', async (req, res) => {
  try {
    const { master_id } = req.query;
    if (!master_id) return res.status(400).json({ error: 'Параметр master_id обязателен' });

    const blocks = await db.queryAll(
      `SELECT id, master_id, ${dateCol('date')} AS date, ${timeCol('start_time')} AS start_time, ${timeCol('end_time')} AS end_time, reason FROM unavailability WHERE master_id = $1 ORDER BY date, start_time`,
      [master_id]
    );
    res.json(blocks);
  } catch (err) {
    console.error('GET /api/admin/unavailability:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/unavailability/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.queryOne('SELECT id FROM unavailability WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ error: 'Блокировка не найдена' });

    await db.runSql('DELETE FROM unavailability WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/unavailability:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
