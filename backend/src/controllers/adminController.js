const bcrypt = require('bcryptjs');
const db = require('../config/database');
const R  = require('../utils/response');

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email,
  role: u.role, is_active: !!u.is_active,
  created_at: u.created_at, updated_at: u.updated_at,
});

/**
 * GET /api/v1/admin/users
 */
const listUsers = (req, res, next) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;

    const filter = search
      ? `WHERE name LIKE ? OR email LIKE ?`
      : '';
    const args   = search ? [`%${search}%`, `%${search}%`] : [];

    const total = db.prepare(`SELECT COUNT(*) as c FROM users ${filter}`).get(...args).c;
    const users = db.prepare(
      `SELECT id, name, email, role, is_active, created_at, updated_at
       FROM users ${filter}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).all(...args, limit, offset);

    return R.ok(res, 'Users retrieved.', {
      users: users.map(publicUser),
      pagination: {
        total, page, limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/admin/users/:id
 */
const getUser = (req, res, next) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return R.notFound(res, 'User not found.');

    const taskStats = db.prepare(`
      SELECT status, COUNT(*) as count FROM tasks WHERE user_id = ? GROUP BY status
    `).all(req.params.id);

    return R.ok(res, 'User retrieved.', {
      user: publicUser(user),
      taskStats,
    });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/v1/admin/users/:id
 */
const updateUser = (req, res, next) => {
  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) return R.notFound(res, 'User not found.');

    const allowed = ['name', 'role', 'is_active'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.password) {
      updates.password = bcrypt.hashSync(req.body.password, 12);
    }

    if (Object.keys(updates).length === 0)
      return R.badRequest(res, 'Nothing to update.');

    const set = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE users SET ${set}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(updates), req.params.id);

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    return R.ok(res, 'User updated.', { user: publicUser(updated) });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/v1/admin/users/:id
 */
const deleteUser = (req, res, next) => {
  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) return R.notFound(res, 'User not found.');
    if (req.params.id === req.user.id)
      return R.badRequest(res, 'You cannot delete your own account.');

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    return R.ok(res, 'User deleted.');
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/admin/stats
 */
const getDashboardStats = (req, res, next) => {
  try {
    const totalUsers  = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
    const activeUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE is_active = 1").get().c;
    const adminCount  = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get().c;
    const totalTasks  = db.prepare("SELECT COUNT(*) as c FROM tasks").get().c;
    const tasksByStatus = db.prepare(
      "SELECT status, COUNT(*) as count FROM tasks GROUP BY status"
    ).all();
    const recentUsers = db.prepare(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5"
    ).all();

    return R.ok(res, 'Dashboard stats retrieved.', {
      stats: { totalUsers, activeUsers, adminCount, totalTasks, tasksByStatus },
      recentUsers,
    });
  } catch (err) { next(err); }
};

module.exports = { listUsers, getUser, updateUser, deleteUser, getDashboardStats };
