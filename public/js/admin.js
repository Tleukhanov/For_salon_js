const API = '/api/admin';

let blockMasterId = null;

function $(sel) {
  return document.querySelector(sel);
}

function show(el) {
  if (typeof el === 'string') el = $(el);
  el.style.display = '';
}

function hide(el) {
  if (typeof el === 'string') el = $(el);
  el.style.display = 'none';
}

function showError(id, msg) {
  const el = $(id);
  el.textContent = msg;
  el.classList.add('show');
}

function hideError(id) {
  $(id).classList.remove('show');
}

async function apiPost(path, body) {
  const res = await fetch(API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, data };
  return data;
}

async function apiGet(path) {
  const res = await fetch(API + path, { credentials: 'include' });
  if (res.status === 401) throw { status: 401 };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, data };
  return data;
}

async function apiDelete(path) {
  const res = await fetch(API + path, { method: 'DELETE', credentials: 'include' });
  if (res.status === 401) throw { status: 401 };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, data };
  return data;
}

function handleUnauthorized() {
  hide('#dashboard');
  show('#loginScreen');
  showError('#loginError', 'Сессия истекла, войдите снова');
}

/* Login */
$('#loginBtn').addEventListener('click', login);
$('#passwordInput').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

async function login() {
  const password = $('#passwordInput').value;
  if (!password) return;
  hideError('#loginError');
  const btn = $('#loginBtn');
  btn.disabled = true;
  btn.textContent = 'Вход...';
  try {
    await apiPost('/login', { password });
    $('#passwordInput').value = '';
    await enterDashboard();
  } catch (err) {
    if (err.status === 401) {
      showError('#loginError', 'Неверный пароль');
    } else {
      showError('#loginError', 'Ошибка сервера');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Войти';
  }
}

/* Logout */
$('#logoutBtn').addEventListener('click', logout);

async function logout() {
  try {
    await apiPost('/logout', {});
  } catch (_) {}
  hide('#dashboard');
  show('#loginScreen');
}

/* Dashboard */
async function enterDashboard() {
  hide('#loginScreen');
  show('#dashboard');
  hideError('#dashError');
  await Promise.all([loadMasters(), loadBookings()]);
  await loadUnavail();
}

/* Masters */
async function loadMasters() {
  try {
    const masters = await apiGet('/masters');
    const container = $('#mastersList');
    if (masters.length === 0) {
      container.innerHTML = '<div class="admin-empty">Нет мастеров</div>';
      return;
    }
    container.innerHTML = masters.map(m => `
      <div class="admin-master-row">
        <div>
          <span class="admin-master-name">${m.name}</span>
          <span class="admin-badge ${m.active ? 'active' : 'inactive'}">${m.active ? 'Активен' : 'Неактивен'}</span>
        </div>
        <div class="admin-master-actions">
          <button class="btn btn-secondary" onclick="showBlockForm(${m.id}, '${m.name}')">Заблокировать</button>
          ${m.active ? `<button class="btn btn-danger" onclick="deleteMaster(${m.id})">Удалить</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    showError('#dashError', 'Ошибка загрузки мастеров');
  }
}

$('#addMasterBtn').addEventListener('click', addMaster);
$('#newMasterName').addEventListener('keydown', e => { if (e.key === 'Enter') addMaster(); });

async function addMaster() {
  const input = $('#newMasterName');
  const name = input.value.trim();
  if (!name) return;
  hideError('#dashError');
  const btn = $('#addMasterBtn');
  btn.disabled = true;
  try {
    await apiPost('/masters', { name });
    input.value = '';
    await loadMasters();
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    showError('#dashError', 'Ошибка добавления мастера');
  } finally {
    btn.disabled = false;
  }
}

async function deleteMaster(id) {
  if (!confirm('Удалить мастера? Он станет неактивным.')) return;
  hideError('#dashError');
  try {
    await apiDelete('/masters/' + id);
    await loadMasters();
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    showError('#dashError', 'Ошибка удаления мастера');
  }
}

/* Block time */
function showBlockForm(id, name) {
  blockMasterId = id;
  $('#blockMasterName').textContent = name;
  $('#blockDate').value = '';
  $('#blockStart').value = '';
  $('#blockEnd').value = '';
  $('#blockReason').value = '';
  show('#blockSection');
}

$('#blockCancelBtn').addEventListener('click', () => hide('#blockSection'));
$('#blockSaveBtn').addEventListener('click', saveBlock);

async function saveBlock() {
  const date = $('#blockDate').value;
  const start_time = $('#blockStart').value;
  const end_time = $('#blockEnd').value;
  const reason = $('#blockReason').value.trim() || null;
  if (!date || !start_time || !end_time) {
    showError('#dashError', 'Заполните дату и время');
    return;
  }
  hideError('#dashError');
  const btn = $('#blockSaveBtn');
  btn.disabled = true;
  try {
    await apiPost('/unavailability', { master_id: blockMasterId, date, start_time, end_time, reason });
    hide('#blockSection');
    await loadUnavail();
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    showError('#dashError', 'Ошибка блокировки времени');
  } finally {
    btn.disabled = false;
  }
}

/* Unavailability */
async function loadUnavail() {
  let allBlocks = [];
  try {
    const masters = await apiGet('/masters');
    for (const m of masters) {
      const blocks = await apiGet('/unavailability?master_id=' + m.id);
      blocks.forEach(b => { b.master_name = m.name; allBlocks.push(b); });
    }
  } catch (err) {
    if (err.status === 401) return;
    allBlocks = [];
  }
  const container = $('#unavailList');
  if (allBlocks.length === 0) {
    container.innerHTML = '<div class="admin-empty">Нет блокировок</div>';
    return;
  }
  container.innerHTML = allBlocks.map(b => `
    <div class="unavail-item">
      <div>
        <strong>${b.master_name}</strong> — ${b.date} ${b.start_time}-${b.end_time}
        ${b.reason ? ` (${b.reason})` : ''}
      </div>
      <button class="btn btn-danger" onclick="deleteUnavail(${b.id})">Снять</button>
    </div>
  `).join('');
}

async function deleteUnavail(id) {
  hideError('#dashError');
  try {
    await apiDelete('/unavailability/' + id);
    await loadUnavail();
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    showError('#dashError', 'Ошибка снятия блокировки');
  }
}

/* Bookings */
async function loadBookings() {
  try {
    const bookings = await apiGet('/bookings');
    const container = $('#bookingsList');
    if (bookings.length === 0) {
      container.innerHTML = '<div class="admin-empty">Нет записей</div>';
      return;
    }
    const rows = bookings.map(b => `
      <tr>
        <td>${b.booking_date}</td>
        <td>${b.booking_time}</td>
        <td>${b.master_name}</td>
        <td>${b.service_name}</td>
        <td>${b.client_name}</td>
        <td>${b.client_phone}</td>
      </tr>
    `).join('');
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>Дата</th><th>Время</th><th>Мастер</th><th>Услуга</th><th>Клиент</th><th>Телефон</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    showError('#dashError', 'Ошибка загрузки записей');
  }
}
