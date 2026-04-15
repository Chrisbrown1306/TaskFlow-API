// Redirect if already logged in
if (isLoggedIn()) window.location = 'dashboard.html';

let currentTab = 'login';

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
  document.getElementById('loginPanel').classList.toggle('active', tab === 'login');
  document.getElementById('registerPanel').classList.toggle('active', tab === 'register');
  hideAlert();
  clearErrors();
}

function showAlert(msg, type = 'error') {
  const el   = document.getElementById('alert');
  const icon = document.getElementById('alertIcon');
  const txt  = document.getElementById('alertMsg');
  el.className = `alert show ${type}`;
  icon.textContent = type === 'success' ? '✓' : '⚠';
  txt.textContent  = msg;
}
function hideAlert() {
  document.getElementById('alert').classList.remove('show');
}

function setFieldError(id, msg) {
  const input = document.getElementById(id);
  const err   = document.getElementById(id + 'Err');
  if (input) input.classList.toggle('error', !!msg);
  if (err)   { err.textContent = msg || ''; err.classList.toggle('show', !!msg); }
}
function clearErrors() {
  ['loginEmail','loginPassword','regName','regEmail','regPassword'].forEach(id => setFieldError(id, ''));
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

// ── Login ───────────────────────────────────────────────────────────────────
async function handleLogin() {
  clearErrors(); hideAlert();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  let valid = true;
  if (!email)    { setFieldError('loginEmail', 'Email is required.');    valid = false; }
  if (!password) { setFieldError('loginPassword', 'Password is required.'); valid = false; }
  if (!valid) return;

  setLoading('loginBtn', true);
  try {
    const { ok, data } = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (ok) {
      storeSession(data);
      showAlert('Login successful! Redirecting…', 'success');
      setTimeout(() => { window.location = 'dashboard.html'; }, 800);
    } else {
      const errors = data.errors || [];
      if (errors.length) {
        errors.forEach(e => setFieldError('login' + capitalize(e.field), e.message));
      } else {
        showAlert(data.message || 'Login failed. Please try again.');
      }
    }
  } catch {
    showAlert('Could not connect to server. Make sure the backend is running.');
  } finally {
    setLoading('loginBtn', false);
  }
}

// ── Register ─────────────────────────────────────────────────────────────────
async function handleRegister() {
  clearErrors(); hideAlert();
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  let valid = true;
  if (!name)     { setFieldError('regName',     'Name is required.');     valid = false; }
  if (!email)    { setFieldError('regEmail',    'Email is required.');    valid = false; }
  if (!password) { setFieldError('regPassword', 'Password is required.'); valid = false; }
  else if (password.length < 8) { setFieldError('regPassword', 'Minimum 8 characters.'); valid = false; }
  if (!valid) return;

  setLoading('regBtn', true);
  try {
    const { ok, data } = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    if (ok) {
      storeSession(data);
      showAlert('Account created! Redirecting…', 'success');
      setTimeout(() => { window.location = 'dashboard.html'; }, 800);
    } else {
      const errors = data.errors || [];
      if (errors.length) {
        errors.forEach(e => {
          const map = { name: 'regName', email: 'regEmail', password: 'regPassword' };
          if (map[e.field]) setFieldError(map[e.field], e.message);
        });
        showAlert('Please fix the highlighted fields.');
      } else {
        showAlert(data.message || 'Registration failed.');
      }
    }
  } catch {
    showAlert('Could not connect to server. Make sure the backend is running.');
  } finally {
    setLoading('regBtn', false);
  }
}

// ── Demo fill ─────────────────────────────────────────────────────────────────
function fillDemo(type) {
  switchTab('login');
  if (type === 'admin') {
    document.getElementById('loginEmail').value    = 'admin@taskflow.dev';
    document.getElementById('loginPassword').value = 'Admin@1234';
  } else {
    document.getElementById('loginEmail').value    = 'demo@taskflow.dev';
    document.getElementById('loginPassword').value = 'Demo@1234';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

// Enter key support
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (currentTab === 'login')    handleLogin();
    else                           handleRegister();
  }
});
