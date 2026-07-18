const API = '/api/admin';

let blockMasterId = null;

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function show(el) {
  if (typeof el === 'string') el = $(el);
  el.style.display = '';
}

function hide(el) {
  if (typeof el === 'string') el = $(el);
  el.style.display = 'none';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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

async function apiPut(path, body) {
  const res = await fetch(API + path, {
    method: 'PUT',
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
  await Promise.all([loadMasters(), loadServices(), loadBookings('upcoming', '#upcomingBookings')]);
  await loadUnavail();
}

/* Masters */
async function loadMasters() {
  try {
    const masters = await apiGet('/masters');
    const container = $('#mastersList');
    container.innerHTML = '';
    if (masters.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'admin-empty';
      empty.textContent = 'Нет мастеров';
      container.appendChild(empty);
      return;
    }
    masters.forEach(m => {
      const row = document.createElement('div');
      row.className = 'admin-master-row';

      const info = document.createElement('div');
      info.style.display = 'flex';
      info.style.alignItems = 'center';
      info.style.gap = '12px';
      info.style.flex = '1';

      const avatar = document.createElement('div');
      avatar.className = 'admin-master-avatar';
      if (m.avatar_url) {
        const img = document.createElement('img');
        img.src = m.avatar_url;
        img.alt = m.name;
        img.className = 'admin-master-avatar-img';
        avatar.appendChild(img);
      } else {
        avatar.textContent = m.name.charAt(0).toUpperCase();
      }

      const nameBlock = document.createElement('div');
      const nameSpan = document.createElement('span');
      nameSpan.className = 'admin-master-name';
      nameSpan.textContent = m.name;
      nameBlock.appendChild(nameSpan);

      if (m.speciality) {
        const spec = document.createElement('span');
        spec.className = 'admin-master-spec';
        spec.textContent = m.speciality;
        nameBlock.appendChild(spec);
      }
      if (m.description) {
        const desc = document.createElement('span');
        desc.className = 'admin-master-desc';
        desc.textContent = m.description;
        nameBlock.appendChild(desc);
      }

      const badge = document.createElement('span');
      badge.className = 'admin-badge ' + (m.active ? 'active' : 'inactive');
      badge.textContent = m.active ? 'Активен' : 'Неактивен';

      info.appendChild(avatar);
      info.appendChild(nameBlock);
      info.appendChild(badge);

      const actions = document.createElement('div');
      actions.className = 'admin-master-actions';

      if (m.active) {
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-secondary';
        editBtn.textContent = 'Ред.';
        editBtn.addEventListener('click', () => openEditMaster(m));
        actions.appendChild(editBtn);

        const blockBtn = document.createElement('button');
        blockBtn.className = 'btn btn-secondary';
        blockBtn.textContent = 'Заблокировать';
        blockBtn.addEventListener('click', () => showBlockForm(m.id, m.name));
        actions.appendChild(blockBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-danger';
        delBtn.textContent = 'Удалить';
        delBtn.addEventListener('click', () => deleteMaster(m.id, m.name));
        actions.appendChild(delBtn);
      }

      row.appendChild(info);
      row.appendChild(actions);
      container.appendChild(row);
    });
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    showError('#dashError', 'Ошибка загрузки мастеров');
  }
}

$('#addMasterBtn').addEventListener('click', addMaster);

async function addMaster() {
  const nameInput = $('#newMasterName');
  const name = nameInput.value.trim();
  if (!name) return;
  hideError('#dashError');
  const btn = $('#addMasterBtn');
  btn.disabled = true;
  try {
    await apiPost('/masters', {
      name,
      speciality: $('#newMasterSpec').value.trim(),
      description: $('#newMasterDesc').value.trim(),
      avatar_url: $('#newMasterAvatar').value.trim()
    });
    nameInput.value = '';
    $('#newMasterSpec').value = '';
    $('#newMasterDesc').value = '';
    $('#newMasterAvatar').value = '';
    await loadMasters();
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    showError('#dashError', err.data?.error || 'Ошибка добавления мастера');
  } finally {
    btn.disabled = false;
  }
}

function openEditMaster(m) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

  const modal = document.createElement('div');
  modal.className = 'modal-card';

  modal.innerHTML = `
    <h3>Редактировать мастера</h3>
    <div class="form-group">
      <label>Имя</label>
      <input type="text" id="editMName" value="${escapeHtml(m.name)}">
    </div>
    <div class="form-group">
      <label>Специальность</label>
      <input type="text" id="editMSpec" value="${escapeHtml(m.speciality || '')}" placeholder="Например: Мастер маникюра">
    </div>
    <div class="form-group">
      <label>Описание</label>
      <input type="text" id="editMDesc" value="${escapeHtml(m.description || '')}" placeholder="Кратко о мастере">
    </div>
    <div class="form-group">
      <label>Фото (URL)</label>
      <input type="text" id="editMAvatar" value="${escapeHtml(m.avatar_url || '')}" placeholder="https://images.unsplash.com/...">
      <span class="field-hint">Вставьте ссылку на фото с Unsplash или другого сайта</span>
    </div>
    ${m.avatar_url ? `<div class="avatar-preview"><img src="${escapeHtml(m.avatar_url)}" alt="Превью"></div>` : '<div class="avatar-preview avatar-preview-empty">Нет фото</div>'}
    <div class="nav-btns">
      <button class="btn btn-secondary" id="editMCancel">Отмена</button>
      <button class="btn btn-primary" id="editMSave">Сохранить</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  overlay.querySelector('#editMCancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#editMSave').addEventListener('click', async () => {
    const btn = overlay.querySelector('#editMSave');
    btn.disabled = true;
    try {
      await apiPut('/masters/' + m.id, {
        name: overlay.querySelector('#editMName').value,
        speciality: overlay.querySelector('#editMSpec').value,
        description: overlay.querySelector('#editMDesc').value,
        avatar_url: overlay.querySelector('#editMAvatar').value
      });
      overlay.remove();
      await loadMasters();
    } catch (err) {
      if (err.status === 401) return handleUnauthorized();
      showError('#dashError', err.data?.error || 'Ошибка сохранения');
      btn.disabled = false;
    }
  });
}

async function deleteMaster(id, name) {
  if (!confirm('Деактивировать мастера "' + name + '"?\n\nОн исчезнет из публичной записи, но старые записи сохранятся.')) return;
  hideError('#dashError');
  try {
    await apiDelete('/masters/' + id);
    await loadMasters();
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    showError('#dashError', 'Ошибка удаления мастера');
  }
}

/* Services */
let servicesData = [];

async function loadServices() {
  try {
    servicesData = await apiGet('/services');
    renderServices();
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    showError('#dashError', 'Ошибка загрузки услуг');
  }
}

function renderServices() {
  const container = $('#servicesList');
  container.innerHTML = '';
  if (servicesData.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'admin-empty';
    empty.textContent = 'Нет услуг';
    container.appendChild(empty);
    return;
  }

  const table = document.createElement('div');
  table.className = 'admin-services-table';

  servicesData.forEach(s => {
    const row = document.createElement('div');
    row.className = 'admin-service-row';

    const info = document.createElement('div');
    info.className = 'admin-service-info';

    const nameEl = document.createElement('span');
    nameEl.className = 'admin-service-name';
    nameEl.textContent = (s.icon ? s.icon + ' ' : '') + s.name;

    const meta = document.createElement('span');
    meta.className = 'admin-service-meta';
    meta.textContent = s.price.toLocaleString('ru-RU') + ' \u20BD / ' + s.duration_minutes + ' мин.';

    info.appendChild(nameEl);
    if (s.description) {
      const descEl = document.createElement('span');
      descEl.className = 'admin-service-desc';
      descEl.textContent = s.description;
      info.appendChild(descEl);
    }
    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'admin-master-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary';
    editBtn.textContent = 'Ред.';
    editBtn.addEventListener('click', () => startEditService(s));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', () => deleteService(s.id, s.name));
    actions.appendChild(delBtn);

    row.appendChild(info);
    row.appendChild(actions);
    table.appendChild(row);
  });

  container.appendChild(table);
}

function startEditService(s) {
  $('#serviceEditId').value = s.id;
  $('#serviceName').value = s.name;
  $('#servicePrice').value = s.price;
  $('#serviceDuration').value = s.duration_minutes;
  $('#serviceIcon').value = s.icon || '';
  $('#serviceDesc').value = s.description || '';
  $('#serviceSaveBtn').textContent = 'Сохранить';
  show('#serviceCancelBtn');
  show('#serviceSaveBtn');
  $('#serviceSaveBtn').onclick = () => saveService(s.id);
  $('#serviceSaveBtn').disabled = false;
}

$('#serviceCancelBtn').addEventListener('click', resetServiceForm);

function resetServiceForm() {
  $('#serviceEditId').value = '';
  $('#serviceName').value = '';
  $('#servicePrice').value = '';
  $('#serviceDuration').value = '';
  $('#serviceIcon').value = '';
  $('#serviceDesc').value = '';
  $('#serviceSaveBtn').textContent = 'Добавить услугу';
  $('#serviceSaveBtn').onclick = null;
  hide('#serviceCancelBtn');
}

async function saveService(editId) {
  hideError('#dashError');
  const name = $('#serviceName').value.trim();
  const price = $('#servicePrice').value;
  const duration = $('#serviceDuration').value;
  const icon = $('#serviceIcon').value.trim();
  const description = $('#serviceDesc').value.trim();

  if (!name) {
    showError('#dashError', 'Введите название услуги');
    return;
  }
  if (!price || parseInt(price) < 0) {
    showError('#dashError', 'Введите корректную цену');
    return;
  }
  if (!duration || parseInt(duration) < 15 || parseInt(duration) > 480) {
    showError('#dashError', 'Длительность от 15 до 480 минут');
    return;
  }

  const btn = $('#serviceSaveBtn');
  btn.disabled = true;
  try {
    if (editId) {
      await apiPut('/services/' + editId, { name, price: parseInt(price), duration_minutes: parseInt(duration), icon, description });
    } else {
      await apiPost('/services', { name, price: parseInt(price), duration_minutes: parseInt(duration), icon, description });
    }
    resetServiceForm();
    await loadServices();
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    showError('#dashError', err.data?.error || 'Ошибка сохранения услуги');
  } finally {
    btn.disabled = false;
  }
}

$('#serviceSaveBtn').addEventListener('click', () => {
  const editId = $('#serviceEditId').value;
  saveService(editId || null);
});

async function deleteService(id, name) {
  if (!confirm('Удалить услугу "' + name + '"?')) return;
  hideError('#dashError');
  try {
    await apiDelete('/services/' + id);
    await loadServices();
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    if (err.status === 409) {
      showError('#dashError', err.data.error);
    } else {
      showError('#dashError', 'Ошибка удаления услуги');
    }
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
  container.innerHTML = '';
  if (allBlocks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'admin-empty';
    empty.textContent = 'Нет блокировок';
    container.appendChild(empty);
    return;
  }
  allBlocks.forEach(b => {
    const item = document.createElement('div');
    item.className = 'unavail-item';

    const textDiv = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = b.master_name;
    textDiv.appendChild(strong);
    textDiv.appendChild(document.createTextNode(' \u2014 ' + b.date + ' ' + b.start_time + '-' + b.end_time));
    if (b.reason) {
      textDiv.appendChild(document.createTextNode(' (' + b.reason + ')'));
    }

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger';
    delBtn.textContent = 'Снять';
    delBtn.addEventListener('click', () => deleteUnavail(b.id));

    item.appendChild(textDiv);
    item.appendChild(delBtn);
    container.appendChild(item);
  });
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

/* Bookings with tabs */
$('#tabUpcoming').addEventListener('click', () => switchBookingTab('upcoming'));
$('#tabHistory').addEventListener('click', () => switchBookingTab('history'));

function switchBookingTab(tab) {
  $$('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  if (tab === 'upcoming') {
    show('#upcomingBookings');
    hide('#historyBookings');
    loadBookings('upcoming', '#upcomingBookings');
  } else {
    hide('#upcomingBookings');
    show('#historyBookings');
    loadBookings('history', '#historyBookings');
  }
}

async function loadBookings(filter, containerSel) {
  const container = $(containerSel);
  container.innerHTML = '';
  const loading = document.createElement('div');
  loading.className = 'loading';
  loading.textContent = 'Загрузка...';
  container.appendChild(loading);

  try {
    const bookings = await apiGet('/bookings?filter=' + filter);
    container.innerHTML = '';
    if (bookings.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'admin-empty';
      empty.textContent = filter === 'upcoming' ? 'Нет предстоящих записей' : 'Нет записей в истории';
      container.appendChild(empty);
      return;
    }

    const scrollWrap = document.createElement('div');
    scrollWrap.className = 'admin-table-wrap';

    const table = document.createElement('table');
    table.className = 'admin-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Дата', 'Время', 'Мастер', 'Услуга', 'Длит.', 'Клиент', 'Телефон'].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    bookings.forEach(b => {
      const tr = document.createElement('tr');
      [b.booking_date, b.booking_time, b.master_name, b.service_name, b.duration_minutes + ' мин', b.client_name, b.client_phone].forEach(val => {
        const td = document.createElement('td');
        td.textContent = val;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    scrollWrap.appendChild(table);
    container.appendChild(scrollWrap);
  } catch (err) {
    if (err.status === 401) return handleUnauthorized();
    container.innerHTML = '';
    showError('#dashError', 'Ошибка загрузки записей');
  }
}
