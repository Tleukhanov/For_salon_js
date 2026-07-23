<div align="center">

# 💅 Салон Красоты «Бьюти»

Премиальный сайт-визитка салона красоты с онлайн-записью, календарём занятости, панелью администратора и современным интерфейсом. MVP на Node.js + Express + PostgreSQL (SQLite fallback для локальной разработки).

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-sql.js%20fallback-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-Clean-semantic-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Animations-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=white)

![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-51%2F51-brightgreen?style=for-the-badge)

</div>

---

## ✨ Возможности

### Запись клиентов
* **Пошаговый визард** — 4 шага: услуга → мастер → дата/время → контакты
* **Аватары мастеров** — фото или инициалы, специальность и описание
* **Иконки услуг** — эмодзи-иконки, полоска длительности, описание
* **Календарь занятости** — месяц-календарь с цветовой индикацией (зелёный/красный)
* **Ближайшее свободное время** — один клик находит слот в горизонте 60 дней
* **Учёт длительности** — слоты генерируются с учётом времени процедуры
* **Стиль сводки** — запись оформлена как «билет» с иконками
* **WhatsApp** — кнопка поделиться записью (номер салона: +7 775 696 10 05)
* **Календарь (.ics)** — скачай файл для Google/Apple Calendar
* **Анимации успеха** — конфетти + sparkle-звёздочки при подтверждении

### Админ-панель
* **Мастера** — CRUD + модальное окно редактирования с фото/описанием/специальностью
* **Услуги** — CRUD + иконки (эмодзи) и описания
* **Блокировки** — заблокируй время мастера на определённую дату
* **Записи** — вкладки «Предстоящие» / «История»
* **Сессия** — пароль-защита через express-session

### Дизайн
* **Hero-баннеры** — фото Unsplash с градиентным оверлеем на каждом шаге
* **Прогресс-бар** — кружки с номерами и подписями шагов
* **Карточки мастеров** — аватар + специальность + описание
* **Карточки услуг** — эмодзи + полоска длительности + цена
* **Glow + Shimmer** — эффекты свечения и блика на кнопках
* **Адаптивность** — мобильные, планшеты, десктоп
* **prefers-reduced-motion** — уважает настройки доступности

---

## 🛠 Стек

| Категория | Технология |
|---|---|
| Язык | JavaScript (Node.js 22+) |
| Фреймворк | [Express.js](https://expressjs.com/) v4.x |
| База данных | PostgreSQL 16 ( продакшен ) / SQLite sql.js ( локально ) |
| Фронтенд | Vanilla HTML5 / CSS3 / JS (без фреймворков) |
| Аутентификация | express-session + cookie-parser |
| Деплой | Docker / VPS (pm2) |

---

## ⚡ Быстрый старт

### Docker (рекомендуется)
```bash
git clone https://github.com/Tleukhanov/forsalon.git
cd forsalon
docker compose up -d
```
Сервер: `http://localhost:3000` | PostgreSQL на порту `5432`

### Локально (SQLite fallback)
1. **Клонируй репозиторий:**
   ```bash
   git clone https://github.com/Tleukhanov/forsalon.git
   cd forsalon
   ```

2. **Установи зависимости:**
   ```bash
   npm install
   ```

3. **Настрой переменные окружения.** Создай файл `.env`:
   ```env
   PORT=3000
   ADMIN_PASSWORD=your_secret_password
   SESSION_SECRET=your_session_secret
   ```

4. **Запусти сервер:**
   ```bash
   npm start
   ```

5. **Открой в браузере:**
   ```
   http://localhost:3000              — главная страница
   http://localhost:3000/booking.html — онлайн-запись
   http://localhost:3000/admin.html   — панель администратора
   ```

---

## 📁 Структура проекта

```
forsalon/
├── server.js                  # Точка входа, Express-сервер
├── db/
│   ├── database.js            # Двойной движок PG + SQLite, миграции
│   └── migrations/
│       ├── 001_init.sql       # Схема: masters, services, bookings, unavailability
│       └── 002_*.sql          # Добавление avatar_url, description, icon
├── middleware/
│   └── auth.js                # requireAdmin middleware
├── routes/
│   ├── public.js              # Публичные API: слоты, запись, календарь
│   └── admin.js               # Админ API: CRUD, авторизация, фильтрация
├── public/
│   ├── index.html             # Hero-страница с галереей
│   ├── booking.html           # Пошаговая запись с hero-баннерами
│   ├── admin.html             # Панель администратора с модалками
│   ├── css/style.css          # Полный дизайн + анимации
│   ├── js/booking.js          # Логика записи (wizard, календарь, WhatsApp, .ics)
│   └── js/admin.js            # Логика админки (CRUD, модалки, табы)
├── Dockerfile                 # Docker образ приложения
├── docker-compose.yml         # Docker Compose: app + PostgreSQL
├── .env                       # Секреты (не коммитится)
├── package.json
└── salon.db                   # SQLite база данных (автосоздание, только локально)
```

---

## 📡 API Endpoints

### Публичные

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/masters` | Мастера с avatar_url, speciality, description |
| `GET` | `/api/services` | Услуги с icon, description, ценой и длительностью |
| `GET` | `/api/slots` | Свободные слоты (master_id, date, service_id) |
| `GET` | `/api/availability` | Доступность дней (календарь) |
| `GET` | `/api/nearest-slot` | Ближайший свободный слот (horizon 60 дней) |
| `POST` | `/api/bookings` | Создание записи (возвращает cancel_token) |
| `DELETE` | `/api/bookings/:token` | Отмена записи по токену |

### Админские (защищены session-куки)

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/api/admin/login` | Вход по паролю |
| `POST` | `/api/admin/logout` | Выход |
| `GET` | `/api/admin/masters` | Все мастера (включая неактивных) |
| `POST` | `/api/admin/masters` | Добавить мастера (name, avatar_url, description, speciality) |
| `PUT` | `/api/admin/masters/:id` | Редактировать мастера (все поля) |
| `DELETE` | `/api/admin/masters/:id` | Деактивировать (мягкое удаление) |
| `GET` | `/api/admin/services` | Все услуги |
| `POST` | `/api/admin/services` | Добавить услугу (name, price, duration, icon, description) |
| `PUT` | `/api/admin/services/:id` | Редактировать услугу |
| `DELETE` | `/api/admin/services/:id` | Удалить (с защитой от наличия записей) |
| `GET` | `/api/admin/bookings` | Записи с фильтром `upcoming` / `history` |
| `POST` | `/api/admin/unavailability` | Блокировка времени мастера |
| `GET` | `/api/admin/unavailability` | Список блокировок |
| `DELETE` | `/api/admin/unavailability/:id` | Снять блокировку |

---

## 🔒 Безопасность

* **XSS** — все данные рендерятся через `textContent` / `escapeHtml()`
* **SQL-инъекции** — параметризованные запросы ($1/$2 для PG, ? для SQLite)
* **Серверная валидация дат** — прошедшие даты и время отклоняются API
* **Буфер 30 минут** — нельзя записаться на прошедшее время сегодня
* **Race condition protection** — проверка доступности перед INSERT
* **Мягкое удаление** — мастера деактивируются, история сохраняется
* **Защита услуг** — нельзя удалить услугу, если она есть в записях
* **Dual-DB** — `convertParams()` переводит PG-синтаксис в SQLite

---

## 🧪 Тестирование

```bash
# Запусти сервер в одном терминале:
node server.js

# В другом:
node _test.js          # 29 тестов (слоты, запись, админ CRUD)
node _test_fields.js   # 22 теста (аватары, иконки, описания)
```

Для seed данных: `node _seed_api.js`

---

## 🗺️ Планы на будущее

| Приоритет | Фича | Описание |
|---|---|---|
| 🔴 Высокий | **WhatsApp уведомления** | Подтверждение + напоминание за 1 час (WhatsApp Cloud API) |
| 🔴 Высокий | **Личный кабинет клиента** | Регистрация, история записей, повторная запись |
| 🟡 Средний | **SMS-авторизация** | Вход по SMS-коду (Twilio / SMS.ru) |
| 🟡 Средний | **Онлайн-оплата** | ЮKassa / Stripe |
| 🟡 Средний | **Мультифилиал** | Несколько салонов с отдельными расписаниями |
| 🟡 Средний | **Отзывы и рейтинги** | Оценка мастеров и процедур |
| 🟢 Низкий | **Telegram-бот** | Запись через Telegram |
| 🟢 Низкий | **Аналитика** | Графики загрузки, популярные услуги, выручка |
| 🟢 Низкий | **Промокоды** | Скидочные системы |

---

## 🚢 Деплой

### Docker (рекомендуется)
```bash
git clone https://github.com/Tleukhanov/forsalon.git
cd forsalon
# Настрой пароли в docker-compose.yml или .env
docker compose up -d
```

### VPS (pm2)
```bash
git clone https://github.com/Tleukhanov/forsalon.git
cd forsalon
npm install
npm install -g pm2
pm2 start server.js --name forsalon
pm2 save && pm2 startup
```

---

## 👤 Автор

* **Разработчик:** Tleukhanov Yeraly
* **Роль:** Full-Stack Developer
* **Фокус:** Backend (Node.js, Express), Базы данных, UI/UX
* **GitHub:** [@Tleukhanov](https://github.com/Tleukhanov)

---

<div align="center">

Сделано с ❤️ и Node.js

</div>
