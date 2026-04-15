const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const {
  generateAccessToken, generateRefreshToken,
  validateRefreshToken, revokeRefreshToken, revokeAllUserTokens,
} = require('../utils/jwt');
const R = require('../utils/response');

// ── Helpers ───────────────────────────────────────────────────────────────────
const SALT_ROUNDS = 12;

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email,
  role: u.role, is_active: !!u.is_active, created_at: u.created_at,
});

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 */
const register = (req, res, next) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // Only admins can self-register as admin
    const assignedRole = (role === 'admin' && req.user?.role !== 'admin') ? 'user' : role;

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return R.conflict(res, 'An account with that email already exists.');

    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO users (id, name, email, password, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name.trim(), email, hashedPassword, assignedRole);

    const user         = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    const accessToken  = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken(user.id);

    return R.created(res, 'Account created successfully.', {
      user: publicUser(user),
      tokens: { accessToken, refreshToken },
    });
  } catch (err) { next(err); }
};

/**
 * POST /api/v1/auth/login
 */
const login = (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return R.unauthorized(res, 'Invalid email or password.');
    if (!user.is_active) return R.unauthorized(res, 'Account is disabled. Contact support.');

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return R.unauthorized(res, 'Invalid email or password.');

    const accessToken  = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken(user.id);

    return R.ok(res, 'Login successful.', {
      user: publicUser(user),
      tokens: { accessToken, refreshToken },
    });
  } catch (err) { next(err); }
};

/**
 * POST /api/v1/auth/refresh
 */
const refresh = (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    const stored = validateRefreshToken(refreshToken);
    if (!stored) return R.unauthorized(res, 'Invalid or expired refresh token.');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(stored.user_id);
    if (!user || !user.is_active)
      return R.unauthorized(res, 'User not found or disabled.');

    // Rotate: revoke old, issue new
    revokeRefreshToken(refreshToken);
    const newAccess  = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefresh = generateRefreshToken(user.id);

    return R.ok(res, 'Token refreshed.', {
      tokens: { accessToken: newAccess, refreshToken: newRefresh },
    });
  } catch (err) { next(err); }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) revokeRefreshToken(refreshToken);
    return R.ok(res, 'Logged out successfully.');
  } catch (err) { next(err); }
};

/**
 * POST /api/v1/auth/logout-all  (authenticated)
 */
const logoutAll = (req, res, next) => {
  try {
    revokeAllUserTokens(req.user.id);
    return R.ok(res, 'Logged out from all devices.');
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/auth/me  (authenticated)
 */
const me = (req, res, next) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return R.notFound(res, 'User not found.');
    return R.ok(res, 'Profile retrieved.', { user: publicUser(user) });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/v1/auth/me  (authenticated) – update own profile
 */
const updateMe = (req, res, next) => {
  try {
    const { name, password } = req.body;
    const updates = {};

    if (name)     updates.name     = name.trim();
    if (password) updates.password = bcrypt.hashSync(password, SALT_ROUNDS);

    if (Object.keys(updates).length === 0)
      return R.badRequest(res, 'Nothing to update. Provide name or password.');

    const set = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE users SET ${set}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(updates), req.user.id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    return R.ok(res, 'Profile updated.', { user: publicUser(user) });
  } catch (err) { next(err); }
};

module.exports = { register, login, refresh, logout, logoutAll, me, updateMe };
