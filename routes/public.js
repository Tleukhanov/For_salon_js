const { Router } = require('express');
const crypto = require('crypto');
const db = require('../db/database');

const router = Router();

const WORK_START = 8;
const WORK_END = 18;
const SLOT_STEP_MINUTES = 30;
const TODAY_BUFFER_MINUTES = 30;

/* DB-agnostic helpers */
function activeWhere() { return db.isPg() ? 'active = TRUE' : 'active = 1'; }
function timeCol(c) { return db.isPg() ? `${c}::text` : c; }
function dateCol(c) { return db.isPg() ? `${c}::text` : c; }

function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str + 'T00:00:00'));
}
function isValidTime(str) {
  return /^\d{2}:\d{2}$/.test(str);
}
function timeToMinutes(t) {
  const s = String(t).substring(0, 5);
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}
function getTodayStr() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}
function getNowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
function generateCandidateSlots(durationMinutes) {
  const slots = [];
  const workEndMin = WORK_END * 60;
  for (let m = WORK_START * 60; m < workEndMin; m += SLOT_STEP_MINUTES) {
    if (m + durationMinutes <= workEndMin) {
      slots.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
    }
  }
  return slots;
}
function isSlotBlocked(slotStartMin, slotEndMin, bookedRanges, unavailRanges) {
  for (const b of bookedRanges) {
    if (slotStartMin < b.end && b.start < slotEndMin) return true;
  }
  for (const u of unavailRanges) {
    const uStart = timeToMinutes(u.start_time);
    const uEnd = timeToMinutes(u.end_time);
    if (slotStartMin < uEnd && uStart < slotEndMin) return true;
  }
  return false;
}
function parseTime(v) { return String(v).substring(0, 5); }

/* ===================== ROUTES ===================== */

router.get('/masters', async (req, res) => {
  try {
    const masters = await db.queryAll(`SELECT id, name, avatar_url, description, speciality FROM masters WHERE ${activeWhere()}`);
    res.json(masters);
  } catch (err) {
    console.error('GET /api/masters:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/services', async (req, res) => {
  try {
    const services = await db.queryAll('SELECT id, name, price, duration_minutes, icon, description FROM services');
    res.json(services);
  } catch (err) {
    console.error('GET /api/services:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/slots', async (req, res) => {
  try {
    const { master_id, date, service_id } = req.query;
    if (!master_id || !date) return res.status(400).json({ error: 'Параметры master_id и date обязательны' });
    if (!isValidDate(date)) return res.status(400).json({ error: 'Некорректный формат даты. Используйте YYYY-MM-DD' });

    const today = getTodayStr();
    if (date < today) return res.status(400).json({ error: 'Нельзя записаться на прошедшую дату' });

    const master = await db.queryOne(`SELECT id FROM masters WHERE id = $1 AND ${activeWhere()}`, [master_id]);
    if (!master) return res.status(400).json({ error: 'Мастер не найден или неактивен' });

    let duration = SLOT_STEP_MINUTES;
    if (service_id) {
      const service = await db.queryOne('SELECT duration_minutes FROM services WHERE id = $1', [service_id]);
      if (!service) return res.status(400).json({ error: 'Услуга не найдена' });
      duration = service.duration_minutes;
    }

    const candidates = generateCandidateSlots(duration);

    const bookedRows = await db.queryAll(
      `SELECT ${timeCol('b.booking_time')} AS booking_time, s.duration_minutes
       FROM bookings b JOIN services s ON s.id = b.service_id
       WHERE b.master_id = $1 AND b.booking_date = $2`,
      [master_id, date]
    );
    const bookedRanges = bookedRows.map(r => ({
      start: timeToMinutes(parseTime(r.booking_time)),
      end: timeToMinutes(parseTime(r.booking_time)) + r.duration_minutes
    }));

    const unavailRanges = await db.queryAll(
      `SELECT ${timeCol('start_time')} AS start_time, ${timeCol('end_time')} AS end_time
       FROM unavailability WHERE master_id = $1 AND date = $2`,
      [master_id, date]
    );

    let availableSlots = candidates.filter(time => {
      const slotStart = timeToMinutes(time);
      return !isSlotBlocked(slotStart, slotStart + duration, bookedRanges, unavailRanges);
    });

    if (date === today) {
      const nowMin = getNowMinutes() + TODAY_BUFFER_MINUTES;
      availableSlots = availableSlots.filter(time => timeToMinutes(time) >= nowMin);
    }

    res.json(availableSlots);
  } catch (err) {
    console.error('GET /api/slots:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/availability', async (req, res) => {
  try {
    const { master_id, from, to, service_id } = req.query;
    if (!master_id || !from || !to) return res.status(400).json({ error: 'Параметры master_id, from, to обязательны' });
    if (!isValidDate(from) || !isValidDate(to)) return res.status(400).json({ error: 'Некорректный формат даты' });

    const today = getTodayStr();
    const effectiveFrom = from < today ? today : from;
    if (effectiveFrom > to) return res.json([]);

    const master = await db.queryOne(`SELECT id FROM masters WHERE id = $1 AND ${activeWhere()}`, [master_id]);
    if (!master) return res.status(400).json({ error: 'Мастер не найден или неактивен' });

    let duration = SLOT_STEP_MINUTES;
    if (service_id) {
      const service = await db.queryOne('SELECT duration_minutes FROM services WHERE id = $1', [service_id]);
      if (service) duration = service.duration_minutes;
    }

    const allDates = await db.queryAll(
      `SELECT DISTINCT ${dateCol('booking_date')} AS date FROM bookings
       WHERE master_id = $1 AND booking_date >= $2 AND booking_date <= $3`,
      [master_id, effectiveFrom, to]
    );
    const allUnavail = await db.queryAll(
      `SELECT DISTINCT ${dateCol('date')} AS date FROM unavailability
       WHERE master_id = $1 AND date >= $2 AND date <= $3`,
      [master_id, effectiveFrom, to]
    );

    const bookedDates = new Set(allDates.map(r => String(r.date).substring(0, 10)));
    const unavailDates = new Set(allUnavail.map(r => String(r.date).substring(0, 10)));

    const result = [];
    const startMs = new Date(effectiveFrom + 'T00:00:00').getTime();
    const endMs = new Date(to + 'T00:00:00').getTime();
    for (let ms = startMs; ms <= endMs; ms += 86400000) {
      const d = new Date(ms);
      const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

      if (d.getDay() === 0) {
        result.push({ date: ds, has_slots: false, total_slots: 0 });
        continue;
      }

      const candidates = generateCandidateSlots(duration);

      let bookedRanges = [];
      if (bookedDates.has(ds)) {
        const rows = await db.queryAll(
          `SELECT ${timeCol('b.booking_time')} AS booking_time, s.duration_minutes
           FROM bookings b JOIN services s ON s.id = b.service_id
           WHERE b.master_id = $1 AND b.booking_date = $2`,
          [master_id, ds]
        );
        bookedRanges = rows.map(r => ({
          start: timeToMinutes(parseTime(r.booking_time)),
          end: timeToMinutes(parseTime(r.booking_time)) + r.duration_minutes
        }));
      }

      let unavailRanges = [];
      if (unavailDates.has(ds)) {
        unavailRanges = await db.queryAll(
          `SELECT ${timeCol('start_time')} AS start_time, ${timeCol('end_time')} AS end_time
           FROM unavailability WHERE master_id = $1 AND date = $2`,
          [master_id, ds]
        );
      }

      let available = candidates.filter(time => {
        const s = timeToMinutes(time);
        return !isSlotBlocked(s, s + duration, bookedRanges, unavailRanges);
      });

      if (ds === today) {
        const nowMin = getNowMinutes() + TODAY_BUFFER_MINUTES;
        available = available.filter(time => timeToMinutes(time) >= nowMin);
      }

      result.push({ date: ds, has_slots: available.length > 0, total_slots: available.length });
    }

    res.json(result);
  } catch (err) {
    console.error('GET /api/availability:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.get('/nearest-slot', async (req, res) => {
  try {
    const { master_id, service_id, from } = req.query;
    if (!master_id || !service_id) return res.status(400).json({ error: 'Параметры master_id и service_id обязательны' });

    const master = await db.queryOne(`SELECT id FROM masters WHERE id = $1 AND ${activeWhere()}`, [master_id]);
    if (!master) return res.status(400).json({ error: 'Мастер не найден или неактивен' });

    const service = await db.queryOne('SELECT duration_minutes FROM services WHERE id = $1', [service_id]);
    if (!service) return res.status(400).json({ error: 'Услуга не найдена' });

    const duration = service.duration_minutes;
    const today = getTodayStr();
    const fromDate = from && isValidDate(from) && from >= today ? from : today;
    const startMs = new Date(fromDate + 'T00:00:00').getTime();

    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const d = new Date(startMs + dayOffset * 86400000);
      if (d.getDay() === 0) continue;

      const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const candidates = generateCandidateSlots(duration);

      const bookedRows = await db.queryAll(
        `SELECT ${timeCol('b.booking_time')} AS booking_time, s.duration_minutes
         FROM bookings b JOIN services s ON s.id = b.service_id
         WHERE b.master_id = $1 AND b.booking_date = $2`,
        [master_id, ds]
      );
      const bookedRanges = bookedRows.map(r => ({
        start: timeToMinutes(parseTime(r.booking_time)),
        end: timeToMinutes(parseTime(r.booking_time)) + r.duration_minutes
      }));

      const unavailRanges = await db.queryAll(
        `SELECT ${timeCol('start_time')} AS start_time, ${timeCol('end_time')} AS end_time
         FROM unavailability WHERE master_id = $1 AND date = $2`,
        [master_id, ds]
      );

      let available = candidates.filter(time => {
        const s = timeToMinutes(time);
        return !isSlotBlocked(s, s + duration, bookedRanges, unavailRanges);
      });

      if (ds === today) {
        const nowMin = getNowMinutes() + TODAY_BUFFER_MINUTES;
        available = available.filter(time => timeToMinutes(time) >= nowMin);
      }

      if (available.length > 0) return res.json({ date: ds, time: available[0] });
    }

    res.json(null);
  } catch (err) {
    console.error('GET /api/nearest-slot:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const { master_id, service_id, date, time, client_name, client_phone } = req.body;
    if (!master_id || !service_id || !date || !time || !client_name || !client_phone) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    if (!isValidDate(date)) return res.status(400).json({ error: 'Некорректный формат даты' });
    if (!isValidTime(time)) return res.status(400).json({ error: 'Некорректный формат времени' });

    const today = getTodayStr();
    if (date < today) return res.status(400).json({ error: 'Нельзя записаться на прошедшую дату' });

    const master = await db.queryOne(`SELECT id FROM masters WHERE id = $1 AND ${activeWhere()}`, [master_id]);
    if (!master) return res.status(400).json({ error: 'Мастер не найден или неактивен' });

    const service = await db.queryOne('SELECT id, duration_minutes FROM services WHERE id = $1', [service_id]);
    if (!service) return res.status(400).json({ error: 'Услуга не найдена' });

    const slotStart = timeToMinutes(time);
    const slotEnd = slotStart + service.duration_minutes;
    if (slotStart < WORK_START * 60 || slotEnd > WORK_END * 60) {
      return res.status(400).json({ error: 'Время записи вне рабочих часов' });
    }
    if (date === today) {
      if (slotStart < getNowMinutes() + TODAY_BUFFER_MINUTES) {
        return res.status(400).json({ error: 'Это время уже прошло' });
      }
    }

    const bookedRows = await db.queryAll(
      `SELECT ${timeCol('b.booking_time')} AS booking_time, s.duration_minutes
       FROM bookings b JOIN services s ON s.id = b.service_id
       WHERE b.master_id = $1 AND b.booking_date = $2`,
      [master_id, date]
    );
    const bookedRanges = bookedRows.map(r => ({
      start: timeToMinutes(parseTime(r.booking_time)),
      end: timeToMinutes(parseTime(r.booking_time)) + r.duration_minutes
    }));
    const unavailRanges = await db.queryAll(
      `SELECT ${timeCol('start_time')} AS start_time, ${timeCol('end_time')} AS end_time
       FROM unavailability WHERE master_id = $1 AND date = $2`,
      [master_id, date]
    );
    if (isSlotBlocked(slotStart, slotEnd, bookedRanges, unavailRanges)) {
      return res.status(409).json({ error: 'Это время уже занято, выберите другое' });
    }

    const cancel_token = crypto.randomUUID();
    const result = await db.runSql(
      `INSERT INTO bookings (master_id, service_id, booking_date, booking_time, client_name, client_phone, cancel_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [master_id, service_id, date, time, client_name.trim(), client_phone.trim(), cancel_token]
    );
    const id = result.rows && result.rows[0] ? result.rows[0].id : result.lastID;
    res.status(201).json({ id, cancel_token });
  } catch (err) {
    if (err.message && (err.message.includes('unique constraint') || err.message.includes('UNIQUE constraint'))) {
      return res.status(409).json({ error: 'Это время уже занято, выберите другое' });
    }
    console.error('POST /api/bookings:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/bookings/:cancel_token', async (req, res) => {
  try {
    const { cancel_token } = req.params;
    const existing = await db.queryOne('SELECT id FROM bookings WHERE cancel_token = $1', [cancel_token]);
    if (!existing) return res.status(404).json({ error: 'Запись не найдена' });
    await db.runSql('DELETE FROM bookings WHERE cancel_token = $1', [cancel_token]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/bookings:', err.message);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
