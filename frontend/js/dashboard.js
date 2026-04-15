// Guard: redirect if not logged in
if (!isLoggedIn()) window.location = 'index.html';

// ── State ─────────────────────────────────────────────────────────────────────
let currentUser   = getStoredUser();
let editingTaskId = null;
let deletingTaskId = null;
let currentPage   = 1;
let searchTimer   = null;
let adminSearchTimer = null;

// ── Init ──────────────────────────────────────────────────────────────────────
(async function init() {
  // Refresh user profile
  const { ok, data } = await apiFetch('/auth/me');
  if (!ok) { clearSession(); window.location = 'index.html'; return; }
  currentUser = data.user;
  storeSession({ user: currentUser, tokens: { accessToken: getToken(), refreshToken: getRefresh() } });

  renderSidebar();
  setupNav();
  await loadStats();
  await loadTasks();
})();

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderSidebar() {
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('sidebarName').textContent   = currentUser.name;
  document.getElementById('sidebarRole').textContent   = currentUser.role;

  if (currentUser.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
  }
}

function setupNav() {
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const view = link.dataset.view;
      document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById('view' + capitalize(view)).classList.add('active');
      if (view === 'admin') { loadAdminStats(); loadUsers(); }
    });
  });
}

async function logout() {
  await apiFetch('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: getRefresh() }),
  }).catch(() => {});
  clearSession();
  window.location = 'index.html';
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function loadStats() {
  const { ok, data } = await apiFetch('/tasks/stats');
  if (!ok) return;
  const s = data.stats;
  document.getElementById('statTotal').textContent    = s.total;
  document.getElementById('statTodo').textContent     = s.todo;
  document.getElementById('statProgress').textContent = s.inProgress;
  document.getElementById('statDone').textContent     = s.done;
  document.getElementById('statOverdue').textContent  = s.overdue;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
async function loadTasks(page = 1) {
  currentPage = page;
  const status   = document.getElementById('filterStatus').value;
  const priority = document.getElementById('filterPriority').value;
  const sort     = document.getElementById('filterSort').value;
  const search   = document.getElementById('searchInput').value.trim();

  const params = new URLSearchParams({ page, limit: 10, sort, order: sort === 'title' ? 'asc' : 'desc' });
  if (status)   params.set('status',   status);
  if (priority) params.set('priority', priority);
  if (search)   params.set('search',   search);

  document.getElementById('taskList').innerHTML = '<div class="loading-state">Loading…</div>';

  const { ok, data } = await apiFetch('/tasks?' + params.toString());
  if (!ok) { showToast('Failed to load tasks', 'error'); return; }

  const { tasks, pagination } = data;
  const subtitle = `${pagination.total} task${pagination.total !== 1 ? 's' : ''}`;
  document.getElementById('taskSubtitle').textContent = subtitle;

  renderTasks(tasks);
  renderPagination(pagination);
}

function renderTasks(tasks) {
  const list = document.getElementById('taskList');
  if (!tasks.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <div class="empty-title">No tasks found</div>
        <p>Create your first task to get started.</p>
      </div>`;
    return;
  }

  list.innerHTML = tasks.map(task => {
    const isOverdue = task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date();
    const dueLabel  = task.due_date
      ? `<span class="badge ${isOverdue ? 'badge-overdue' : 'badge-date'}">📅 ${formatDate(task.due_date)}</span>`
      : '';
    return `
    <div class="task-card" id="task-${task.id}">
      <div class="task-check ${task.status === 'done' ? 'done' : ''}"
           onclick="quickToggle('${task.id}','${task.status}')"
           title="Toggle done">
        ${task.status === 'done' ? '✓' : ''}
      </div>
      <div class="task-body">
        <div class="task-title ${task.status === 'done' ? 'done' : ''}">${escHtml(task.title)}</div>
        ${task.description ? `<div class="task-desc">${escHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          <span class="badge badge-${task.status}">${statusLabel(task.status)}</span>
          <span class="badge badge-${task.priority}">${capitalize(task.priority)}</span>
          ${dueLabel}
        </div>
      </div>
      <div class="task-actions">
        <button class="icon-btn" onclick="openModal('${task.id}')" title="Edit">✏️</button>
        <button class="icon-btn delete" onclick="openConfirm('${task.id}')" title="Delete">🗑️</button>
      </div>
    </div>`;
  }).join('');
}

function renderPagination({ page, totalPages }) {
  const el = document.getElementById('taskPagination');
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="loadTasks(${page - 1})" ${page <= 1 ? 'disabled' : ''}>←</button>`;
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      html += `<button class="page-btn ${p === page ? 'active' : ''}" onclick="loadTasks(${p})">${p}</button>`;
    } else if (Math.abs(p - page) === 2) {
      html += `<span class="page-btn" style="cursor:default;border:none">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="loadTasks(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>→</button>`;
  el.innerHTML = html;
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadTasks(1), 350);
}

async function quickToggle(id, currentStatus) {
  const newStatus = currentStatus === 'done' ? 'todo' : 'done';
  const { ok } = await apiFetch('/tasks/' + id, {
    method: 'PATCH', body: JSON.stringify({ status: newStatus }),
  });
  if (ok) { loadStats(); loadTasks(currentPage); }
  else showToast('Could not update task', 'error');
}

// ── Modal ─────────────────────────────────────────────────────────────────────
async function openModal(taskId = null) {
  editingTaskId = taskId;
  clearModal();

  if (taskId) {
    document.getElementById('modalTitle').textContent = 'Edit Task';
    const { ok, data } = await apiFetch('/tasks/' + taskId);
    if (!ok) { showToast('Could not load task', 'error'); return; }
    const t = data.task;
    document.getElementById('taskTitle').value    = t.title;
    document.getElementById('taskDesc').value     = t.description || '';
    document.getElementById('taskStatus').value   = t.status;
    document.getElementById('taskPriority').value = t.priority;
    document.getElementById('taskDue').value      = t.due_date ? t.due_date.split('T')[0] : '';
  } else {
    document.getElementById('modalTitle').textContent = 'New Task';
  }
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingTaskId = null;
  clearModal();
}

function closeModalOnOverlay(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function clearModal() {
  ['taskTitle','taskDesc','taskDue'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('taskStatus').value   = 'todo';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskTitleErr').classList.remove('show');
  hideModalAlert();
}

async function saveTask() {
  const title    = document.getElementById('taskTitle').value.trim();
  const desc     = document.getElementById('taskDesc').value.trim();
  const status   = document.getElementById('taskStatus').value;
  const priority = document.getElementById('taskPriority').value;
  const due_date = document.getElementById('taskDue').value || null;

  if (!title) {
    document.getElementById('taskTitleErr').textContent = 'Title is required.';
    document.getElementById('taskTitleErr').classList.add('show');
    return;
  }

  const btn     = document.getElementById('saveTaskBtn');
  btn.classList.add('loading'); btn.disabled = true;

  const payload = { title, description: desc || null, status, priority, due_date };
  const path    = editingTaskId ? '/tasks/' + editingTaskId : '/tasks';
  const method  = editingTaskId ? 'PATCH' : 'POST';

  const { ok, data } = await apiFetch(path, { method, body: JSON.stringify(payload) });

  btn.classList.remove('loading'); btn.disabled = false;

  if (ok) {
    closeModal();
    showToast(editingTaskId ? 'Task updated ✓' : 'Task created ✓', 'success');
    loadStats();
    loadTasks(currentPage);
  } else {
    const errors = data.errors || [];
    if (errors.length) {
      showModalAlert(errors.map(e => e.message).join(' · '), 'error');
    } else {
      showModalAlert(data.message || 'Save failed.', 'error');
    }
  }
}

// ── Delete confirm ────────────────────────────────────────────────────────────
function openConfirm(id) {
  deletingTaskId = id;
  document.getElementById('confirmOverlay').classList.add('open');
}
function closeConfirm() {
  deletingTaskId = null;
  document.getElementById('confirmOverlay').classList.remove('open');
}
async function confirmDeleteTask() {
  if (!deletingTaskId) return;
  const { ok } = await apiFetch('/tasks/' + deletingTaskId, { method: 'DELETE' });
  closeConfirm();
  if (ok) { showToast('Task deleted', 'success'); loadStats(); loadTasks(currentPage); }
  else    showToast('Delete failed', 'error');
}

// ── Admin ─────────────────────────────────────────────────────────────────────
async function loadAdminStats() {
  const { ok, data } = await apiFetch('/admin/stats');
  if (!ok) return;
  const s = data.stats;
  document.getElementById('aStatUsers').textContent  = s.totalUsers;
  document.getElementById('aStatActive').textContent = s.activeUsers;
  document.getElementById('aStatAdmins').textContent = s.adminCount;
  document.getElementById('aStatTasks').textContent  = s.totalTasks;
}

async function loadUsers(search = '') {
  const params = new URLSearchParams({ limit: 50 });
  if (search) params.set('search', search);
  const { ok, data } = await apiFetch('/admin/users?' + params);
  if (!ok) return;

  const wrap = document.getElementById('userTable');
  if (!data.users.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">No users found</div></div>'; return; }

  wrap.innerHTML = `
  <table class="user-table">
    <thead><tr>
      <th>Name</th><th>Email</th><th>Role</th>
      <th>Status</th><th>Joined</th><th>Actions</th>
    </tr></thead>
    <tbody>
      ${data.users.map(u => `
        <tr>
          <td>${escHtml(u.name)}</td>
          <td style="color:#94a3b8">${escHtml(u.email)}</td>
          <td><span class="role-badge ${u.role}">${u.role}</span></td>
          <td>
            <span class="status-dot ${u.is_active ? 'active' : 'inactive'}"></span>
            ${u.is_active ? 'Active' : 'Disabled'}
          </td>
          <td style="color:#64748b">${formatDate(u.created_at)}</td>
          <td>
            <button class="icon-btn" onclick="toggleUserActive('${u.id}',${u.is_active})"
              title="${u.is_active ? 'Disable' : 'Enable'}" ${u.id === currentUser.id ? 'disabled' : ''}>
              ${u.is_active ? '🚫' : '✅'}
            </button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

async function toggleUserActive(userId, currentActive) {
  const { ok } = await apiFetch('/admin/users/' + userId, {
    method: 'PATCH', body: JSON.stringify({ is_active: currentActive ? 0 : 1 }),
  });
  if (ok) { showToast('User updated', 'success'); loadAdminStats(); loadUsers(); }
  else    showToast('Update failed', 'error');
}

function debounceAdminSearch() {
  clearTimeout(adminSearchTimer);
  adminSearchTimer = setTimeout(() => loadUsers(document.getElementById('adminSearch').value), 350);
}

// ── Modal alert ───────────────────────────────────────────────────────────────
function showModalAlert(msg, type = 'error') {
  const el = document.getElementById('modalAlert');
  el.textContent  = msg;
  el.className    = `modal-alert ${type}`;
  el.style.display = 'block';
}
function hideModalAlert() {
  const el = document.getElementById('modalAlert');
  if (el) el.style.display = 'none';
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'}</span> ${escHtml(msg)}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = '.3s'; setTimeout(() => toast.remove(), 300); }, 2800);
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusLabel(s) {
  return { todo: 'To Do', in_progress: 'In Progress', done: 'Done' }[s] || s;
}

// Keyboard shortcut: N = new task
document.addEventListener('keydown', e => {
  if (e.key === 'n' && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
    openModal();
  }
  if (e.key === 'Escape') { closeModal(); closeConfirm(); }
});
