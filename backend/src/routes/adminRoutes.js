const router = require('express').Router();
const ctrl   = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { param, query } = require('express-validator');

// All admin routes require auth + admin role
router.use(authenticate, authorize('admin'));

/**
 * @swagger
 * /api/v1/admin/stats:
 *   get:
 *     summary: Platform-wide dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200: { description: Aggregated platform stats }
 *       403: { description: Admin only }
 */
router.get('/stats', ctrl.getDashboardStats);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List all users (paginated)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: User list }
 *       403: { description: Admin only }
 */
router.get('/users', ctrl.listUsers);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get a user's profile + task stats
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User + task stats }
 *       404: { description: User not found }
 *   patch:
 *     summary: Update any user's role, name, or active status
 *     tags: [Admin]
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
 *               name:      { type: string }
 *               role:      { type: string, enum: [user, admin] }
 *               is_active: { type: boolean }
 *               password:  { type: string }
 *     responses:
 *       200: { description: Updated user }
 *   delete:
 *     summary: Delete a user and all their data
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Deleted }
 */
router.get('/users/:id',    ctrl.getUser);
router.patch('/users/:id',  ctrl.updateUser);
router.delete('/users/:id', ctrl.deleteUser);

module.exports = router;
