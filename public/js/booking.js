const API = '/api';

const state = {
  step: 1,
  masterId: null,
  masterName: '',
  masterAvatar: '',
  serviceId: null,
  serviceName: '',
  servicePrice: 0,
  serviceDuration: 0,
  serviceIcon: '',
  date: '',
  time: '',
  clientName: '',
  clientPhone: '',
  cancelToken: localStorage.getItem('cancelToken'),
  calYear: 0,
  calMonth: 0,
  availabilityCache: {},
};

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showError(msg) {
  const el = $('#errorMsg');
  el.textContent = msg;
  el.classList.add('show');
}

function hideError() {
  $('#errorMsg').classList.remove('show');
}

function showLoading(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = '';
}

function hideLoading(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

async function apiGet(path) {
  const res = await fetch(API + path);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Ошибка сервера');
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, data };
  return data;
}

async function apiDelete(path) {
  const res = await fetch(API + path, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, data };
  return data;
}

function goToStep(n) {
  state.step = n;
  $$('.step-panel').forEach(el => el.classList.remove('active'));
  const panel = $(`.step-panel[data-step="${n}"]`);
  panel.classList.add('active');
  $$('.step-progress-item').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
    const circle = el.querySelector('.step-circle');
    if (s < n) circle.innerHTML = '&#10003;';
  });
  $$('.step-line').forEach((el, i) => {
    el.classList.toggle('done', i < n - 1);
  });
  hideError();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatDateRu(dateStr) {
  const parts = dateStr.split('-');
  const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  return parseInt(parts[2]) + ' ' + months[parseInt(parts[1]) - 1] + ' ' + parts[0];
}

function formatDateShort(dateStr) {
  const parts = dateStr.split('-');
  return parts[2] + '.' + parts[1];
}

/* Step 1 — Masters */
async function loadMasters() {
  showLoading('mastersLoading');
  try {
    const masters = await apiGet('/masters');
    const list = $('#mastersList');
    list.innerHTML = '';
    masters.forEach(m => {
      const label = document.createElement('label');
      label.className = 'card card-master';
      label.dataset.id = m.id;

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'master';
      input.value = m.id;

      const avatarEl = document.createElement('div');
      avatarEl.className = 'card-avatar';
      if (m.avatar_url) {
        const img = document.createElement('img');
        img.src = m.avatar_url;
        img.alt = m.name;
        img.className = 'card-avatar-img';
        avatarEl.appendChild(img);
      } else {
        avatarEl.textContent = m.name.charAt(0).toUpperCase();
      }

      const textBlock = document.createElement('div');
      textBlock.className = 'card-text';

      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = m.name;

      textBlock.appendChild(title);

      if (m.speciality) {
        const spec = document.createElement('div');
        spec.className = 'card-sub card-spec';
        spec.textContent = m.speciality;
        textBlock.appendChild(spec);
      }
      if (m.description) {
        const desc = document.createElement('div');
        desc.className = 'card-sub';
        desc.textContent = m.description;
        textBlock.appendChild(desc);
      }

      label.appendChild(input);
      label.appendChild(avatarEl);
      label.appendChild(textBlock);
      list.appendChild(label);

      label.addEventListener('click', () => {
        list.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        label.classList.add('selected');
        input.checked = true;
        state.masterId = parseInt(m.id);
        state.masterName = m.name;
        state.masterAvatar = m.avatar_url || '';
        state.date = '';
        state.time = '';
        state.availabilityCache = {};
        $('#toStep2').disabled = false;
      });
    });
  } catch (err) {
    showError('Не удалось загрузить список мастеров. Проверьте соединение.');
  } finally {
    hideLoading('mastersLoading');
  }
}

$('#toStep2').addEventListener('click', () => {
  if (state.masterId) {
    goToStep(2);
    loadServices();
  }
});

/* Step 2 — Services */
async function loadServices() {
  showLoading('servicesLoading');
  try {
    const services = await apiGet('/services');
    const list = $('#servicesList');
    list.innerHTML = '';
    services.forEach(s => {
      const label = document.createElement('label');
      label.className = 'card card-service';
      label.dataset.id = s.id;

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'service';
      input.value = s.id;

      const iconEl = document.createElement('div');
      iconEl.className = 'card-service-icon';
      iconEl.textContent = s.icon || '\u2728';

      const textBlock = document.createElement('div');
      textBlock.className = 'card-text';

      const title = document.createElement('div');
      title.className = 'card-title';
      title.textContent = s.name;

      textBlock.appendChild(title);

      if (s.description) {
        const desc = document.createElement('div');
        desc.className = 'card-sub';
        desc.textContent = s.description;
        textBlock.appendChild(desc);
      }

      const durPrice = document.createElement('div');
      durPrice.className = 'card-dur-price';

      const durBar = document.createElement('div');
      durBar.className = 'dur-bar';
      const durFill = document.createElement('div');
      durFill.className = 'dur-fill';
      durFill.style.width = Math.min((s.duration_minutes / 120) * 100, 100) + '%';
      durBar.appendChild(durFill);
      const durText = document.createElement('span');
      durText.className = 'dur-text';
      durText.textContent = s.duration_minutes + ' мин.';
      durPrice.appendChild(durBar);
      durPrice.appendChild(durText);

      const price = document.createElement('div');
      price.className = 'card-price';
      price.textContent = s.price.toLocaleString('ru-RU') + ' \u20BD';

      label.appendChild(input);
      label.appendChild(iconEl);
      label.appendChild(textBlock);
      label.appendChild(durPrice);
      label.appendChild(price);
      list.appendChild(label);

      label.addEventListener('click', () => {
        list.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        label.classList.add('selected');
        input.checked = true;
        state.serviceId = s.id;
        state.serviceName = s.name;
        state.servicePrice = s.price;
        state.serviceDuration = s.duration_minutes;
        state.serviceIcon = s.icon || '\u2728';
        state.date = '';
        state.time = '';
        state.availabilityCache = {};
        $('#toStep3').disabled = false;
      });
    });
    if (state.serviceId) {
      const selected = list.querySelector(`.card[data-id="${state.serviceId}"]`);
      if (selected) {
        selected.classList.add('selected');
        selected.querySelector('input').checked = true;
        $('#toStep3').disabled = false;
      }
    }
  } catch (err) {
    showError('Не удалось загрузить список услуг.');
  } finally {
    hideLoading('servicesLoading');
  }
}

$('#toStep3').addEventListener('click', () => {
  if (state.serviceId) {
    goToStep(3);
    initCalendar();
  }
});

$('#backTo1').addEventListener('click', () => goToStep(1));
$('#backTo2').addEventListener('click', () => goToStep(2));
$('#backTo3').addEventListener('click', () => goToStep(3));

/* Step 3 — Calendar */
function initCalendar() {
  const now = new Date();
  state.calYear = now.getFullYear();
  state.calMonth = now.getMonth();
  state.availabilityCache = {};
  renderCalendar();
}

function renderCalendar() {
  const year = state.calYear;
  const month = state.calMonth;
  const months = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  $('#calTitle').textContent = months[month] + ' ' + year;

  const now = new Date();
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const maxMonth = currentMonth + 1;
  const maxYear = currentYear + (maxMonth > 11 ? 1 : 0);
  const effectiveMaxMonth = maxMonth % 12;

  const isLastAllowed = (year === currentYear && month === currentMonth) || (year === maxYear && month === effectiveMaxMonth);
  const isCurrentOrPast = year < currentYear || (year === currentYear && month <= currentMonth);

  $('#calPrev').disabled = isCurrentOrPast;
  $('#calNext').disabled = isLastAllowed;

  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const body = $('#calBody');
  body.innerHTML = '';

  for (let i = 0; i < startDow; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day cal-day-empty';
    body.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const dayEl = document.createElement('div');
    dayEl.className = 'cal-day';
    dayEl.textContent = d;

    const dateObj = new Date(year, month, d);
    const dow = dateObj.getDay();
    const isWeekend = dow === 0;
    const isPast = ds < todayStr;
    const isSelected = ds === state.date;

    if (isWeekend) {
      dayEl.classList.add('cal-day-disabled');
      dayEl.title = 'Выходной';
    } else if (isPast) {
      dayEl.classList.add('cal-day-disabled');
    } else {
      dayEl.dataset.date = ds;

      const cached = state.availabilityCache[ds];
      if (cached !== undefined) {
        if (cached === 0) {
          dayEl.classList.add('cal-day-busy');
        } else {
          dayEl.classList.add('cal-day-available');
        }
      }

      if (isSelected) {
        dayEl.classList.add('cal-day-selected');
      }

      dayEl.addEventListener('click', () => selectDate(ds));
    }

    body.appendChild(dayEl);
  }

  loadAvailability();
}

async function loadAvailability() {
  const year = state.calYear;
  const month = state.calMonth;
  const from = year + '-' + String(month + 1).padStart(2, '0') + '-01';
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');

  const cacheKey = from;
  if (state.availabilityCache[cacheKey + '_loaded']) return;

  try {
    const data = await apiGet(`/availability?master_id=${state.masterId}&service_id=${state.serviceId}&from=${from}&to=${to}`);
    data.forEach(d => {
      state.availabilityCache[d.date] = d.total_slots;
    });
    state.availabilityCache[cacheKey + '_loaded'] = true;
    renderCalendarDays();
  } catch (err) {
    console.error('Ошибка загрузки доступности:', err);
  }
}

function renderCalendarDays() {
  const days = $$('.cal-day[data-date]');
  days.forEach(dayEl => {
    const ds = dayEl.dataset.date;
    const cached = state.availabilityCache[ds];
    dayEl.classList.remove('cal-day-available', 'cal-day-busy', 'cal-day-selected');
    if (cached !== undefined) {
      if (cached === 0) {
        dayEl.classList.add('cal-day-busy');
      } else {
        dayEl.classList.add('cal-day-available');
      }
    }
    if (ds === state.date) {
      dayEl.classList.add('cal-day-selected');
    }
  });
}

function selectDate(ds) {
  state.date = ds;
  state.time = '';
  $('#toStep4').disabled = true;
  renderCalendarDays();
  loadSlots();
}

async function loadSlots() {
  if (!state.masterId || !state.date) return;
  const slotsSection = $('#slotsSection');
  const slotsContainer = $('#slotsList');
  const noSlots = $('#noSlots');
  slotsSection.style.display = '';
  showLoading('slotsLoading');
  slotsContainer.innerHTML = '';
  noSlots.style.display = 'none';
  $('#toStep4').disabled = true;

  const dateLabel = $('#slotsDateLabel');
  dateLabel.textContent = formatDateRu(state.date);

  try {
    const slots = await apiGet(`/slots?master_id=${state.masterId}&date=${state.date}&service_id=${state.serviceId}`);
    hideLoading('slotsLoading');
    if (slots.length === 0) {
      noSlots.style.display = '';
      return;
    }
    slots.forEach(t => {
      const el = document.createElement('div');
      el.className = 'slot';
      el.dataset.time = t;
      el.textContent = t;
      el.addEventListener('click', () => {
        slotsContainer.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        state.time = t;
        $('#toStep4').disabled = false;
      });
      slotsContainer.appendChild(el);
    });
  } catch (err) {
    hideLoading('slotsLoading');
    showError('Не удалось загрузить свободное время.');
  }
}

$('#calPrev').addEventListener('click', () => {
  state.calMonth--;
  if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
  renderCalendar();
});

$('#calNext').addEventListener('click', () => {
  state.calMonth++;
  if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
  renderCalendar();
});

/* Nearest Slot */
$('#nearestSlotBtn').addEventListener('click', findNearestSlot);

async function findNearestSlot() {
  hideError();
  const btn = $('#nearestSlotBtn');
  btn.disabled = true;
  btn.textContent = 'Поиск...';

  try {
    const result = await apiGet(`/nearest-slot?master_id=${state.masterId}&service_id=${state.serviceId}`);
    if (!result) {
      showError('Свободных слотов нет в ближайшие 60 дней');
      return;
    }
    state.date = result.date;
    state.time = result.time;

    const d = new Date(result.date + 'T00:00:00');
    state.calYear = d.getFullYear();
    state.calMonth = d.getMonth();
    state.availabilityCache = {};
    renderCalendar();

    const slotsSection = $('#slotsSection');
    slotsSection.style.display = '';
    showLoading('slotsLoading');
    const slotsContainer = $('#slotsList');
    slotsContainer.innerHTML = '';
    $('#noSlots').style.display = 'none';

    const dateLabel = $('#slotsDateLabel');
    dateLabel.textContent = formatDateRu(result.date);

    const slots = await apiGet(`/slots?master_id=${state.masterId}&date=${result.date}&service_id=${state.serviceId}`);
    hideLoading('slotsLoading');
    slots.forEach(t => {
      const el = document.createElement('div');
      el.className = 'slot';
      el.dataset.time = t;
      el.textContent = t;
      if (t === result.time) {
        el.classList.add('selected');
      }
      el.addEventListener('click', () => {
        slotsContainer.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        state.time = t;
        $('#toStep4').disabled = false;
      });
      slotsContainer.appendChild(el);
    });
    $('#toStep4').disabled = false;
  } catch (err) {
    hideLoading('slotsLoading');
    showError('Не удалось найти ближайший слот.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-nearest-icon">\u26A1</span> Ближайшее свободное время';
  }
}

$('#toStep4').addEventListener('click', () => {
  if (state.time) {
    renderBookingSummary();
    goToStep(4);
  }
});

/* Step 4 — Contact form */
function renderBookingSummary() {
  const el = $('#bookingSummary');
  el.innerHTML = '';
  el.className = 'booking-summary ticket-card';

  const items = [
    ['&#128105;', '\u041C\u0430\u0441\u0442\u0435\u0440', state.masterName],
    [state.serviceIcon || '&#10024;', '\u0423\u0441\u043B\u0443\u0433\u0430', state.serviceName + ' (' + state.serviceDuration + ' \u043C\u0438\u043D.)'],
    ['&#128176;', '\u0426\u0435\u043D\u0430', state.servicePrice.toLocaleString('ru-RU') + ' \u20BD'],
    ['&#128197;', '\u0414\u0430\u0442\u0430', formatDateRu(state.date)],
    ['&#128336;', '\u0412\u0440\u0435\u043C\u044F', state.time],
  ];
  items.forEach(([icon, label, value]) => {
    const row = document.createElement('div');
    row.className = 'ticket-row';
    const iconSpan = document.createElement('span');
    iconSpan.className = 'ticket-icon';
    iconSpan.innerHTML = icon;
    const labelSpan = document.createElement('span');
    labelSpan.className = 'ticket-label';
    labelSpan.textContent = label + ': ';
    const valueSpan = document.createElement('span');
    valueSpan.className = 'ticket-value';
    valueSpan.textContent = value;
    row.appendChild(iconSpan);
    row.appendChild(labelSpan);
    row.appendChild(valueSpan);
    el.appendChild(row);
  });
}

$('#clientName').addEventListener('input', checkForm);
$('#clientPhone').addEventListener('input', checkForm);

function checkForm() {
  state.clientName = $('#clientName').value.trim();
  state.clientPhone = $('#clientPhone').value.trim();
  $('#confirmBooking').disabled = !state.clientName || !state.clientPhone;
}

$('#confirmBooking').addEventListener('click', submitBooking);

async function submitBooking() {
  hideError();
  const btn = $('#confirmBooking');
  btn.disabled = true;
  btn.textContent = 'Отправка...';

  try {
    const result = await apiPost('/bookings', {
      master_id: state.masterId,
      service_id: state.serviceId,
      date: state.date,
      time: state.time,
      client_name: state.clientName,
      client_phone: state.clientPhone,
    });

    state.cancelToken = result.cancel_token;
    localStorage.setItem('cancelToken', result.cancel_token);

    const details = $('#successDetails');
    details.innerHTML = '';
    details.className = 'success-details ticket-card';

    const items = [
      ['&#128105;', '\u041C\u0430\u0441\u0442\u0435\u0440', state.masterName],
      [state.serviceIcon || '&#10024;', '\u0423\u0441\u043B\u0443\u0433\u0430', state.serviceName],
      ['&#128176;', '\u0426\u0435\u043D\u0430', state.servicePrice.toLocaleString('ru-RU') + ' \u20BD'],
      ['&#128197;', '\u0414\u0430\u0442\u0430', formatDateRu(state.date)],
      ['&#128336;', '\u0412\u0440\u0435\u043C\u044F', state.time]
    ];
    items.forEach(([icon, label, value]) => {
      const row = document.createElement('div');
      row.className = 'ticket-row';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'ticket-icon';
      iconSpan.innerHTML = icon;
      const labelSpan = document.createElement('span');
      labelSpan.className = 'ticket-label';
      labelSpan.textContent = label + ': ';
      const valueSpan = document.createElement('span');
      valueSpan.className = 'ticket-value';
      valueSpan.textContent = value;
      row.appendChild(iconSpan);
      row.appendChild(labelSpan);
      row.appendChild(valueSpan);
      details.appendChild(row);
    });

    const actions = document.createElement('div');
    actions.className = 'success-actions';

    const whatsAppBtn = document.createElement('a');
    const salonPhone = '77756961005';
    const waText = encodeURIComponent(`Запись в салоне "Бьюти"\n${state.masterName} | ${state.serviceName}\n${formatDateRu(state.date)} в ${state.time}`);
    whatsAppBtn.href = `https://wa.me/${salonPhone}?text=${waText}`;
    whatsAppBtn.target = '_blank';
    whatsAppBtn.className = 'btn btn-success-whatsapp';
    whatsAppBtn.textContent = '\uD83D\uDCF1 Поделиться в WhatsApp';
    actions.appendChild(whatsAppBtn);

    const calBtn = document.createElement('button');
    calBtn.className = 'btn btn-secondary';
    calBtn.textContent = '\uD83D\uDCC5 Добавить в календарь';
    calBtn.addEventListener('click', downloadICS);
    actions.appendChild(calBtn);

    details.appendChild(actions);

    goToStep(5);
    launchConfetti();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Подтвердить запись';

    if (err.status === 409) {
      showError('Это время уже заняли. Выберите другое время.');
      state.time = '';
      await loadSlots();
    } else {
      showError(err.data?.error || 'Ошибка при бронировании. Попробуйте снова.');
    }
  }
}

/* Confetti */
function downloadICS() {
  const [y, m, d] = state.date.split('-');
  const [hh, mm] = state.time.split(':');
  const dtStart = y + m + d + 'T' + hh + mm + '00';
  const endMin = parseInt(hh) * 60 + parseInt(mm) + state.serviceDuration;
  const eh = String(Math.floor(endMin / 60)).padStart(2, '0');
  const em = String(endMin % 60).padStart(2, '0');
  const dtEnd = y + m + d + 'T' + eh + em + '00';

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ForSalon//Booking//RU',
    'BEGIN:VEVENT',
    'DTSTART:' + dtStart,
    'DTEND:' + dtEnd,
    'SUMMARY:' + state.serviceName + ' — ' + state.masterName,
    'DESCRIPTION:Запись в салоне "Бьюти". ' + state.serviceName + ' у ' + state.masterName,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'booking.ics';
  a.click();
  URL.revokeObjectURL(url);
}

function launchConfetti() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const container = document.querySelector('.success-screen');
  if (!container) return;

  const colors = ['#c4918a', '#c9a96e', '#e8b4b8', '#d4a574', '#f0d08c'];
  for (let i = 0; i < 40; i++) {
    const spark = document.createElement('div');
    spark.className = 'confetti-spark';
    spark.style.left = Math.random() * 100 + '%';
    spark.style.top = Math.random() * 30 + '%';
    spark.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    spark.style.animationDelay = Math.random() * 0.6 + 's';
    spark.style.animationDuration = (0.8 + Math.random() * 0.8) + 's';
    container.appendChild(spark);
  }
  setTimeout(() => {
    container.querySelectorAll('.confetti-spark').forEach(s => s.remove());
  }, 2000);
}

/* Step 5 — Cancel */
$('#cancelBookingBtn').addEventListener('click', async () => {
  const token = state.cancelToken || localStorage.getItem('cancelToken');
  if (!token) {
    showError('Нет токена для отмены');
    return;
  }

  const btn = $('#cancelBookingBtn');
  btn.disabled = true;
  btn.textContent = 'Отмена...';

  try {
    await apiDelete('/bookings/' + token);
    localStorage.removeItem('cancelToken');
    goToStep(6);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Отменить запись';
    if (err.status === 404) {
      showError('Запись уже была отменена');
      localStorage.removeItem('cancelToken');
    } else {
      showError('Ошибка при отмене записи');
    }
  }
});

loadMasters();
