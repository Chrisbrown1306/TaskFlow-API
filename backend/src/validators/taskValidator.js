const { body, query, param } = require('express-validator');

const createTaskValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be 2–200 characters.')
    .escape(),

  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters.')
    .escape(),

  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'done']).withMessage('Status must be todo, in_progress, or done.'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high.'),

  body('due_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date (YYYY-MM-DD).')
    .toDate(),
];

const updateTaskValidator = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Title must be 2–200 characters.')
    .escape(),

  body('description')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters.')
    .escape(),

  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'done']).withMessage('Status must be todo, in_progress, or done.'),

  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high.'),

  body('due_date')
    .optional({ nullable: true })
    .isISO8601().withMessage('Due date must be a valid ISO 8601 date (YYYY-MM-DD).')
    .toDate(),
];

const listTasksValidator = [
  query('status')
    .optional()
    .isIn(['todo', 'in_progress', 'done']).withMessage('Invalid status filter.'),

  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Invalid priority filter.'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100.')
    .toInt(),

  query('sort')
    .optional()
    .isIn(['created_at', 'updated_at', 'due_date', 'priority', 'title'])
    .withMessage('Invalid sort field.'),

  query('order')
    .optional()
    .isIn(['asc', 'desc']).withMessage('Order must be asc or desc.'),
];

const taskIdValidator = [
  param('id')
    .isUUID().withMessage('Task ID must be a valid UUID.'),
];

module.exports = {
  createTaskValidator,
  updateTaskValidator,
  listTasksValidator,
  taskIdValidator,
};
