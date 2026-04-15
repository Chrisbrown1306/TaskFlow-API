const router = require('express').Router();
const ctrl   = require('../controllers/taskController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate }  = require('../middleware/validate');
const {
  createTaskValidator, updateTaskValidator,
  listTasksValidator, taskIdValidator,
} = require('../validators/taskValidator');

// All task routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/tasks/stats:
 *   get:
 *     summary: Get task statistics for current user (admin sees all)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Task counts by status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:      { type: integer }
 *                     todo:       { type: integer }
 *                     inProgress: { type: integer }
 *                     done:       { type: integer }
 *                     overdue:    { type: integer }
 */
router.get('/stats', ctrl.getStats);

/**
 * @swagger
 * /api/v1/tasks:
 *   get:
 *     summary: List tasks (paginated, filterable)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [todo, in_progress, done] }
 *       - in: query
 *         name: priority
 *         schema: { type: string, enum: [low, medium, high] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search in title & description
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [created_at, updated_at, due_date, title] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: Paginated task list
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:       { type: string, example: "Write unit tests" }
 *               description: { type: string }
 *               status:      { type: string, enum: [todo, in_progress, done] }
 *               priority:    { type: string, enum: [low, medium, high] }
 *               due_date:    { type: string, format: date, example: "2025-12-31" }
 *     responses:
 *       201: { description: Task created }
 *       400: { description: Validation error }
 */
router.get('/',  listTasksValidator,  validate, ctrl.listTasks);
router.post('/', createTaskValidator, validate, ctrl.createTask);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   get:
 *     summary: Get a single task by ID
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Task object }
 *       403: { description: Not your task }
 *       404: { description: Not found }
 *   patch:
 *     summary: Update a task (partial update)
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:       { type: string }
 *               description: { type: string }
 *               status:      { type: string, enum: [todo, in_progress, done] }
 *               priority:    { type: string, enum: [low, medium, high] }
 *               due_date:    { type: string, format: date }
 *     responses:
 *       200: { description: Updated task }
 *       404: { description: Not found }
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Not your task }
 *       404: { description: Not found }
 */
router.get('/:id',    taskIdValidator, validate, ctrl.getTask);
router.patch('/:id',  [...taskIdValidator, ...updateTaskValidator], validate, ctrl.updateTask);
router.delete('/:id', taskIdValidator, validate, ctrl.deleteTask);

module.exports = router;
