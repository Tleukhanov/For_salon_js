<div align="center">

# 💅 Салон Красоты «Бьюти»

Премиальный сайт-визитка салона красоты с онлайн-записью, календарём занятости, панелью администратора и современным интерфейсом. Полноценный MVP на Node.js + Express + SQLite.

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-sql.js-07405E?style=for-the-badge&logo=sqlite&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-Clean-semantic-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-Animations-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=for-the-badge&logo=javascript&logoColor=white)

![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)

</div>

---

## ✨ Возможности

* **Онлайн-запись с пошаговым мастером** — удобный 4-шаговый визард: мастер → услуга → дата/время → контакты
* **Календарь занятости** — компактный месяц-календарь с цветовой индикацией доступных/занятых дней
* **Ближайшее свободное время** — одна кнопка находит ближайший слот в горизонте 60 дней
* **Учёт длительности услуг** — слоты генерируются с учётом времени процедуры, пересечения исключены
* **Полноценная админ-панель** — управление мастерами, услугами, блокировками и записями
* **История и предстоящие записи** — разделение на вкладки: админ видит будущее по умолчанию
* **Премиальный дизайн** — тёплая кремово-розовая палитра, анимации, галерея из Unsplash
* **Полная адаптивность** — корректно работает на мобильных, планшетах и десктопе

---

## 🛠 Стек

| Категория | Технология |
|---|---|
| Язык | JavaScript (Node.js 22+) |
| Фреймворк | [Express.js](https://expressjs.com/) v4.x |
| База данных | SQLite через [sql.js](https://github.com/sql-js/sql.js) |
| Фронтенд | Vanilla HTML5 / CSS3 / JS |
| Аутентификация | express-session + cookie-parser |
| Деплой | Railway / VPS / Docker |

---

## ⚡ Быстрый старт

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
   http://localhost:3000          — главная страница
   http://localhost:3000/booking.html  — онлайн-запись
   http://localhost:3000/admin.html    — панель администратора
   ```

---

## 📁 Структура проекта

```
forsalon/
├── server.js               # Точка входа, Express-сервер
├── db/
│   └── database.js         # Инициализация SQLite, схема, save/load
├── middleware/
│   └── auth.js             # requireAdmin middleware
├── routes/
│   ├── public.js           # Публичные API: слоты, запись, календарь
│   └── admin.js            # Админ API: CRUD, авторизация, фильтрация
├── public/
│   ├── index.html          # Hero-страница с галереей
│   ├── booking.html        # Пошаговая запись с календарём
│   ├── admin.html          # Панель администратора
│   ├── css/style.css       # Полный дизайн + анимации
│   ├── js/booking.js       # Логика записи (календарь, слоты, конфетти)
│   └── js/admin.js         # Логика админки (CRUD, вкладки)
├── .env                    # Секреты (не коммитится)
├── package.json
└── salon.db                # SQLite база данных (автосоздание)
```

---

## 📡 API Endpoints

### Публичные

| Метод | Путь | Описание |
|---|---|---|
| `GET` | `/api/masters` | Список активных мастеров |
| `GET` | `/api/services` | Список услуг (название, цена, длительность) |
| `GET` | `/api/slots` | Свободные слоты по дате, мастеру и услуге |
| `GET` | `/api/availability` | Доступность дней (календарь) |
| `GET` | `/api/nearest-slot` | Ближайший свободный слот (horizon 60 дней) |
| `POST` | `/api/bookings` | Создание записи |
| `DELETE` | `/api/bookings/:token` | Отмена записи по токену |

### Админские (защищены)

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/api/admin/login` | Вход по паролю |
| `POST` | `/api/admin/logout` | Выход |
| `GET` | `/api/admin/masters` | Все мастера (включая неактивных) |
| `POST` | `/api/admin/masters` | Добавить мастера |
| `PUT` | `/api/admin/masters/:id` | Редактировать имя |
| `DELETE` | `/api/admin/masters/:id` | Деактивировать (мягкое удаление) |
| `GET` | `/api/admin/services` | Все услуги |
| `POST` | `/api/admin/services` | Добавить услугу |
| `PUT` | `/api/admin/services/:id` | Редактировать услугу |
| `DELETE` | `/api/admin/services/:id` | Удалить (с защитой от наличия записей) |
| `GET` | `/api/admin/bookings` | Записи с фильтром `upcoming` / `history` |
| `POST` | `/api/admin/unavailability` | Блокировка времени |
| `GET` | `/api/admin/unavailability` | Список блокировок мастера |
| `DELETE` | `/api/admin/unavailability/:id` | Снять блокировку |

---

## 🔒 Безопасность

* **Серверная валидация дат** — прошедшие даты и время отклоняются API, не только на клиенте
* **Буфер 30 минут** — нельзя записаться на время, которое уже прошло сегодня
* **Race condition protection** — повторная проверка доступности перед INSERT
* **Safe DOM rendering** — все пользовательские данные рендерятся через `textContent` (защита XSS)
* **Мягкое удаление** — мастера деактивируются, история записей сохраняется
* **Защита услуг** — нельзя удалить услугу, если она есть в записях клиентов

---

## 🗺️ Планы на будущее

| Приоритет | Фича | Описание |
|---|---|---|
| 🔴 Высокий | **PostgreSQL** | Миграция с sql.js на полноценную БД для продакшена |
| 🔴 Высокий | **SMS / Email уведомления** | Напоминание за 1 час до записи через Twilio / SendGrid |
| 🔴 Высокий | **Личный кабинет клиента** | Регистрация, история записей, повторная запись |
| 🟡 Средний | **Онлайн-оплата** | Интеграция с ЮKassa / Stripe |
| 🟡 Средний | **Мультифилиал** | Несколько салонов с отдельными расписаниями |
| 🟡 Средний | **Фото галерея работ** | Загрузка работ мастерами в портфолио |
| 🟡 Средний | **Отзывы и рейтинги** | Оценка мастеров и процедур после визита |
| 🟢 Низкий | **Telegram-бот** | Запись через Telegram по аналогии с вебом |
| 🟢 Низкий | **Аналитика** | Графики загрузки, популярные услуги, выручка |
| 🟢 Низкий | **Промокоды и акции** | Скидочные системы для постоянных клиентов |

---

## 🚢 Деплой

### Railway (бесплатно)
1. Залей на GitHub
2. Создай **New Web Service** на [railway.app](https://railway.app)
3. Подключи репозиторий
4. Build: `npm install` | Start: `npm start`
5. Добавь переменные `PORT`, `ADMIN_PASSWORD`, `SESSION_SECRET`

### VPS (DigitalOcean / Hetzner)
```bash
# На сервере
git clone https://github.com/Tleukhanov/forsalon.git
cd forsalon
npm install
npm install -g pm2
pm2 start server.js --name forsalon
pm2 save
pm2 startup
```

### Docker
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 👤 Автор

* **Разработчик:** Tleukhanov Yeraly
* **Роль:** Full-Stack Developer
* **Фокус:** Backend (Node.js, Express), Базы данных, Адаптивная вёрстка, UI/UX
* **GitHub:** [@Tleukhanov](https://github.com/Tleukhanov)

---

<div align="center">

Сделано с ❤️ и Node.js

</div>
