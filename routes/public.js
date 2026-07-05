const { Router } = require('express');
const crypto = require('crypto');
const { getDb, saveDb } = require('../db/database');

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

router.get('/masters', (req, res) => {
  try {
    const masters = queryAll('SELECT id, name FROM masters WHERE active = 1');
    res.json(masters);
  } catch (err) {
    console.error('GET /api/masters:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/services', (req, res) => {
  try {
    const services = queryAll('SELECT id, name, price, duration_minutes FROM services');
    res.json(services);
  } catch (err) {
    console.error('GET /api/services:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/slots', (req, res) => {
  try {
    const { master_id, date } = req.query;

    if (!master_id || !date) {
      return res.status(400).json({ error: 'Параметры master_id и date обязательны' });
    }

    const bookedTimes = new Set(
      queryAll(
        'SELECT booking_time FROM bookings WHERE master_id = ? AND booking_date = ?',
        [master_id, date]
      ).map(row => row.booking_time)
    );

    const unavailRanges = queryAll(
      'SELECT start_time, end_time FROM unavailability WHERE master_id = ? AND date = ?',
      [master_id, date]
    );

    const allSlots = [];
    for (let h = 8; h <= 17; h++) {
      allSlots.push(`${String(h).padStart(2, '0')}:00`);
    }

    const availableSlots = allSlots.filter(time => {
      if (bookedTimes.has(time)) return false;
      for (const range of unavailRanges) {
        if (time >= range.start_time && time < range.end_time) return false;
      }
      return true;
    });

    res.json(availableSlots);
  } catch (err) {
    console.error('GET /api/slots:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/bookings', (req, res) => {
  try {
    const { master_id, service_id, date, time, client_name, client_phone } = req.body;

    if (!master_id || !service_id || !date || !time || !client_name || !client_phone) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const db = getDb();
    const cancel_token = crypto.randomUUID();

    try {
      db.run(
        'INSERT INTO bookings (master_id, service_id, booking_date, booking_time, client_name, client_phone, cancel_token) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [master_id, service_id, date, time, client_name, client_phone, cancel_token]
      );
      const idResult = db.exec('SELECT last_insert_rowid()');
      const id = idResult[0].values[0][0];
      saveDb();

      res.status(201).json({ id, cancel_token });
    } catch (insertErr) {
      if (insertErr.message && insertErr.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ error: 'Это время уже занято, выберите другое' });
      }
      throw insertErr;
    }
  } catch (err) {
    console.error('POST /api/bookings:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/bookings/:cancel_token', (req, res) => {
  try {
    const { cancel_token } = req.params;

    const existing = queryOne('SELECT id FROM bookings WHERE cancel_token = ?', [cancel_token]);
    if (!existing) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    const db = getDb();
    db.run('DELETE FROM bookings WHERE cancel_token = ?', [cancel_token]);
    saveDb();

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/bookings:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
