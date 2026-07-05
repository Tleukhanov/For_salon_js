const API = '/api';

let state = {
  step: 1,
  masterId: null,
  serviceId: null,
  serviceName: '',
  servicePrice: 0,
  date: '',
  time: '',
  clientName: '',
  clientPhone: '',
  cancelToken: localStorage.getItem('cancelToken'),
};

function $(sel) {
  return document.querySelector(sel);
}

function $$(sel) {
  return document.querySelectorAll(sel);
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
  if (!res.ok) {
    throw { status: res.status, data };
  }
  return data;
}

async function apiDelete(path) {
  const res = await fetch(API + path, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw { status: res.status, data };
  }
  return data;
}

function goToStep(n) {
  state.step = n;
  $$('.step-panel').forEach(el => el.classList.remove('active'));
  $(`.step-panel[data-step="${n}"]`).classList.add('active');
  $$('.step-dot').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.toggle('active', s === n);
    el.classList.toggle('done', s < n);
  });
  hideError();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* Step 1 — Masters */
async function loadMasters() {
  showLoading('mastersLoading');
  try {
    const masters = await apiGet('/masters');
    const list = $('#mastersList');
    list.innerHTML = masters.map(m => `
      <label class="card" data-id="${m.id}">
        <input type="radio" name="master" value="${m.id}">
        <div class="card-title">${m.name}</div>
      </label>
    `).join('');
    list.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        list.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        card.querySelector('input').checked = true;
        state.masterId = parseInt(card.dataset.id);
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
    loadServices().catch(err => console.error('Ошибка загрузки услуг:', err));
  }
});

/* Step 2 — Services */
async function loadServices() {
  showLoading('servicesLoading');
  try {
    const services = await apiGet('/services');
    const list = $('#servicesList');
    list.innerHTML = services.map(s => `
      <label class="card" data-id="${s.id}" data-name="${s.name}" data-price="${s.price}">
        <input type="radio" name="service" value="${s.id}">
        <div class="card-title">${s.name}</div>
        <div class="card-price">${s.price.toLocaleString()} ₽</div>
      </label>
    `).join('');
    list.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        list.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        card.querySelector('input').checked = true;
        state.serviceId = parseInt(card.dataset.id);
        state.serviceName = card.dataset.name;
        state.servicePrice = parseInt(card.dataset.price);
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
  if (state.serviceId) goToStep(3);
});

$('#backTo1').addEventListener('click', () => goToStep(1));
$('#backTo2').addEventListener('click', () => goToStep(2));
$('#backTo3').addEventListener('click', () => goToStep(3));

/* Step 3 — Date & Slots */
const dateInput = $('#dateInput');
dateInput.min = new Date().toISOString().split('T')[0];

dateInput.addEventListener('change', () => {
  state.date = dateInput.value;
  state.time = '';
  loadSlots().catch(err => console.error('Ошибка загрузки слотов:', err));
});

async function loadSlots() {
  if (!state.masterId || !state.date) return;
  const slotsContainer = $('#slotsList');
  const noSlots = $('#noSlots');
  showLoading('slotsLoading');
  slotsContainer.innerHTML = '';
  noSlots.style.display = 'none';
  $('#toStep4').disabled = true;

  try {
    const slots = await apiGet(`/slots?master_id=${state.masterId}&date=${state.date}`);
    hideLoading('slotsLoading');
    if (slots.length === 0) {
      noSlots.style.display = '';
      return;
    }
    slotsContainer.innerHTML = slots.map(t => `
      <div class="slot" data-time="${t}">${t}</div>
    `).join('');
    slotsContainer.querySelectorAll('.slot').forEach(el => {
      el.addEventListener('click', () => {
        slotsContainer.querySelectorAll('.slot').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        state.time = el.dataset.time;
        $('#toStep4').disabled = false;
      });
    });
  } catch (err) {
    hideLoading('slotsLoading');
    showError('Не удалось загрузить свободное время.');
  }
}

$('#toStep4').addEventListener('click', () => {
  if (state.time) goToStep(4);
});

/* Step 4 — Contact form */
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

    const masterName = $('#mastersList').querySelector(`.card[data-id="${state.masterId}"] .card-title`).textContent;

    $('#successDetails').innerHTML = `
      <p><strong>Мастер:</strong> ${masterName}</p>
      <p><strong>Услуга:</strong> ${state.serviceName}</p>
      <p><strong>Цена:</strong> ${state.servicePrice.toLocaleString()} ₽</p>
      <p><strong>Дата:</strong> ${state.date}</p>
      <p><strong>Время:</strong> ${state.time}</p>
    `;

    goToStep(5);
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
    await apiDelete(`/bookings/${token}`);
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

/* Init */
loadMasters().catch(err => console.error('Ошибка загрузки мастеров:', err));
