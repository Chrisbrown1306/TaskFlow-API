const { verifyAccessToken } = require('../utils/jwt');
const { unauthorized, forbidden } = require('../utils/response');
const db = require('../config/database');

/**
 * authenticate
 * Extracts the Bearer token, verifies it, loads the user from the DB,
 * and attaches it to req.user.  Rejects if the user is inactive.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided. Add: Authorization: Bearer <token>');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    // Always fetch a fresh copy so role/active changes are immediate
    const user = db.prepare(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?'
    ).get(decoded.id);

    if (!user)           return unauthorized(res, 'User no longer exists.');
    if (!user.is_active) return unauthorized(res, 'Account is disabled. Contact support.');

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return unauthorized(res, 'Token expired. Please refresh your token.');
    if (err.name === 'JsonWebTokenError')
      return unauthorized(res, 'Invalid token.');
    return unauthorized(res);
  }
};

/**
 * authorize(...roles)
 * Factory that creates a middleware enforcing that req.user.role
 * is in the allowed list.  Must come AFTER authenticate().
 *
 * Usage:  router.get('/admin', authenticate, authorize('admin'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return forbidden(res, `Access restricted to: ${roles.join(', ')}`);
  }
  next();
};

/**
 * optionalAuth
 * Same as authenticate but doesn't fail on missing token –
 * useful for endpoints that behave differently for logged-in users.
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return next();

  try {
    const decoded = verifyAccessToken(authHeader.split(' ')[1]);
    const user    = db.prepare(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?'
    ).get(decoded.id);
    if (user?.is_active) req.user = user;
  } catch (_) { /* ignore */ }

  next();
};

module.exports = { authenticate, authorize, optionalAuth };
