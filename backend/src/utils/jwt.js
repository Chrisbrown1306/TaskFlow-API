const jwt  = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db   = require('../config/database');

const SECRET       = process.env.JWT_SECRET       || 'fallback_dev_secret_DO_NOT_USE_IN_PROD';
const EXPIRES_IN   = process.env.JWT_EXPIRES_IN   || '7d';
const REFRESH_EXP  = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * Generate an access token (short-lived).
 */
const generateAccessToken = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });

/**
 * Generate a refresh token, persist it, and return the token string.
 */
const generateRefreshToken = (userId) => {
  const token     = uuidv4() + '-' + uuidv4();          // opaque random token
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), userId, token, expiresAt);

  return token;
};

/**
 * Verify an access token – returns the decoded payload or throws.
 */
const verifyAccessToken = (token) => jwt.verify(token, SECRET);

/**
 * Validate a refresh token from the DB – returns the stored row or null.
 */
const validateRefreshToken = (token) => {
  const row = db.prepare(
    `SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > datetime('now')`
  ).get(token);
  return row || null;
};

/**
 * Revoke a single refresh token.
 */
const revokeRefreshToken = (token) =>
  db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);

/**
 * Revoke ALL refresh tokens belonging to a user (logout everywhere).
 */
const revokeAllUserTokens = (userId) =>
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(userId);

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
