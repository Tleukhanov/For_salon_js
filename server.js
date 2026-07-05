require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'default_secret',
  resave: false,
  saveUninitialized: false,
}));

app.use(express.static(path.join(__dirname, 'public')));

initDb().then(() => {
  app.use('/api', require('./routes/public'));
  app.use('/api/admin', require('./routes/admin'));

  const server = app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Ошибка: порт ${PORT} уже занят. Освободите порт или укажите другой через PORT.`);
    } else {
      console.error('Ошибка сервера:', err.message);
    }
    process.exit(1);
  });
}).catch((err) => {
  console.error('Ошибка инициализации БД:', err.message);
  process.exit(1);
});
