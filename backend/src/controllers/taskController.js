const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const R  = require('../utils/response');

// ── Helpers ───────────────────────────────────────────────────────────────────
const PRIORITY_ORDER = { high: 3, medium: 2, low: 1 };

/**
 * Build a dynamic WHERE clause from filter params.
 */
const buildFilters = (params, isAdmin) => {
  const conditions = [];
  const values     = [];

  if (!isAdmin) {
    conditions.push('t.user_id = ?');
    values.push(params.userId);
  } else if (params.user_id) {
    conditions.push('t.user_id = ?');
    values.push(params.user_id);
  }

  if (params.status) {
    conditions.push('t.status = ?');
    values.push(params.status);
  }
  if (params.priority) {
    conditions.push('t.priority = ?');
    values.push(params.priority);
  }
  if (params.search) {
    conditions.push('(t.title LIKE ? OR t.description LIKE ?)');
    values.push(`%${params.search}%`, `%${params.search}%`);
  }

  return {
    clause: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '',
    values,
  };
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/tasks
 * Users see only their own tasks; admins see all (filterable by user_id).
 */
const listTasks = (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const page    = parseInt(req.query.page)  || 1;
    const limit   = parseInt(req.query.limit) || 20;
    const sort    = ['created_at','updated_at','due_date','title'].includes(req.query.sort)
                      ? req.query.sort : 'created_at';
    const order   = req.query.order === 'asc' ? 'ASC' : 'DESC';
    const offset  = (page - 1) * limit;

    const { clause, values } = buildFilters({
      userId:   req.user.id,
      user_id:  req.query.user_id,
      status:   req.query.status,
      priority: req.query.priority,
      search:   req.query.search,
    }, isAdmin);

    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM tasks t ${clause}`
    ).get(...values);

    const tasks = db.prepare(`
      SELECT t.*, u.name as owner_name, u.email as owner_email
      FROM tasks t
      JOIN users u ON u.id = t.user_id
      ${clause}
      ORDER BY t.${sort} ${order}
      LIMIT ? OFFSET ?
    `).all(...values, limit, offset);

    const total = countRow.total;
    return R.ok(res, 'Tasks retrieved.', {
      tasks,
      pagination: {
        total, page, limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/tasks/:id
 */
const getTask = (req, res, next) => {
  try {
    const task = db.prepare(`
      SELECT t.*, u.name as owner_name, u.email as owner_email
      FROM tasks t JOIN users u ON u.id = t.user_id
      WHERE t.id = ?
    `).get(req.params.id);

    if (!task) return R.notFound(res, 'Task not found.');

    // Non-admins can only see their own tasks
    if (req.user.role !== 'admin' && task.user_id !== req.user.id)
      return R.forbidden(res);

    return R.ok(res, 'Task retrieved.', { task });
  } catch (err) { next(err); }
};

/**
 * POST /api/v1/tasks
 */
const createTask = (req, res, next) => {
  try {
    const { title, description = null, status = 'todo', priority = 'medium', due_date = null } = req.body;

    // Admins can create tasks for other users; regular users create for themselves
    const userId = (req.user.role === 'admin' && req.body.user_id)
      ? req.body.user_id
      : req.user.id;

    // Validate target user exists
    const target = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!target) return R.notFound(res, 'Target user not found.');

    const id = uuidv4();
    db.prepare(`
      INSERT INTO tasks (id, title, description, status, priority, due_date, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, status, priority,
          due_date ? new Date(due_date).toISOString().split('T')[0] : null,
          userId);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    return R.created(res, 'Task created.', { task });
  } catch (err) { next(err); }
};

/**
 * PATCH /api/v1/tasks/:id
 */
const updateTask = (req, res, next) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return R.notFound(res, 'Task not found.');

    if (req.user.role !== 'admin' && task.user_id !== req.user.id)
      return R.forbidden(res);

    const allowed = ['title', 'description', 'status', 'priority', 'due_date'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = key === 'due_date' && req.body[key]
          ? new Date(req.body[key]).toISOString().split('T')[0]
          : req.body[key];
      }
    }

    if (Object.keys(updates).length === 0)
      return R.badRequest(res, 'Nothing to update. Provide at least one field.');

    const set = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE tasks SET ${set}, updated_at = datetime('now') WHERE id = ?`)
      .run(...Object.values(updates), req.params.id);

    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    return R.ok(res, 'Task updated.', { task: updated });
  } catch (err) { next(err); }
};

/**
 * DELETE /api/v1/tasks/:id
 */
const deleteTask = (req, res, next) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!task) return R.notFound(res, 'Task not found.');

    if (req.user.role !== 'admin' && task.user_id !== req.user.id)
      return R.forbidden(res);

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    return R.ok(res, 'Task deleted successfully.');
  } catch (err) { next(err); }
};

/**
 * GET /api/v1/tasks/stats  –  summary counts for the current user (or all if admin)
 */
const getStats = (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const filter  = isAdmin ? '' : 'WHERE user_id = ?';
    const args    = isAdmin ? [] : [req.user.id];

    const total      = db.prepare(`SELECT COUNT(*) as c FROM tasks ${filter}`).get(...args).c;
    const todo       = db.prepare(`SELECT COUNT(*) as c FROM tasks ${filter ? filter + ' AND' : 'WHERE'} status = 'todo'`).get(...args).c;
    const inProgress = db.prepare(`SELECT COUNT(*) as c FROM tasks ${filter ? filter + ' AND' : 'WHERE'} status = 'in_progress'`).get(...args).c;
    const done       = db.prepare(`SELECT COUNT(*) as c FROM tasks ${filter ? filter + ' AND' : 'WHERE'} status = 'done'`).get(...args).c;
    const overdue    = db.prepare(`SELECT COUNT(*) as c FROM tasks ${filter ? filter + ' AND' : 'WHERE'} due_date < date('now') AND status != 'done'`).get(...args).c;

    return R.ok(res, 'Stats retrieved.', {
      stats: { total, todo, inProgress, done, overdue },
    });
  } catch (err) { next(err); }
};

module.exports = { listTasks, getTask, createTask, updateTask, deleteTask, getStats };
