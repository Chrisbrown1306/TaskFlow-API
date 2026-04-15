// ── API Configuration ────────────────────────────────────────────────────────
// Change this to your backend URL if deployed elsewhere
const API_BASE = 'http://localhost:5000/api/v1';

// ── Token storage helpers ────────────────────────────────────────────────────
const TOKEN_KEY   = 'tf_access_token';
const REFRESH_KEY = 'tf_refresh_token';
const USER_KEY    = 'tf_user';

const getToken       = () => localStorage.getItem(TOKEN_KEY);
const getRefresh     = () => localStorage.getItem(REFRESH_KEY);
const getStoredUser  = () => { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } };

const storeSession = ({ user, tokens }) => {
  localStorage.setItem(TOKEN_KEY,   tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY,    JSON.stringify(user));
};

const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
};

const isLoggedIn = () => !!getToken();

// ── Fetch wrapper with auto-refresh ─────────────────────────────────────────
async function apiFetch(path, options = {}, _retried = false) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(API_BASE + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  // Auto-refresh on 401
  if (res.status === 401 && !_retried) {
    const refreshToken = getRefresh();
    if (!refreshToken) { clearSession(); window.location = 'index.html'; return; }

    const rRes  = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const rData = await rRes.json().catch(() => ({}));

    if (rRes.ok) {
      const user = getStoredUser();
      storeSession({ user, tokens: rData.tokens });
      return apiFetch(path, options, true);    // retry once
    } else {
      clearSession();
      window.location = 'index.html';
      return;
    }
  }

  return { ok: res.ok, status: res.status, data };
}
