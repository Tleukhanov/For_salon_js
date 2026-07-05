const { initDb, saveDb } = require('./database');

const MASTERS = ['Анна', 'Мария', 'Елена'];

const SERVICES = [
  ['Маникюр', 2000, 60],
  ['Педикюр', 2500, 75],
  ['Чистка лица', 3000, 90],
  ['Окрашивание бровей', 800, 30],
  ['Массаж лица', 2200, 45],
];

async function seed() {
  const db = await initDb();

  const masterCount = db.exec("SELECT COUNT(*) as cnt FROM masters")[0].values[0][0];
  if (masterCount === 0) {
    for (const name of MASTERS) {
      db.run("INSERT INTO masters (name, active) VALUES (?, 1)", [name]);
    }
    console.log('Добавлено мастеров:', MASTERS.length);
  } else {
    console.log('Мастера уже существуют, пропускаем');
  }

  const serviceCount = db.exec("SELECT COUNT(*) as cnt FROM services")[0].values[0][0];
  if (serviceCount === 0) {
    for (const [name, price, duration] of SERVICES) {
      db.run("INSERT INTO services (name, price, duration_minutes) VALUES (?, ?, ?)", [name, price, duration]);
    }
    console.log('Добавлено услуг:', SERVICES.length);
  } else {
    console.log('Услуги уже существуют, пропускаем');
  }

  saveDb();
  console.log('Seed завершён');
}

seed().catch((err) => {
  console.error('Ошибка seed:', err.message);
  process.exit(1);
});
