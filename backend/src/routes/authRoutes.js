const router  = require('express').Router();
const ctrl    = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate }     = require('../middleware/validate');
const {
  registerValidator, loginValidator, refreshValidator,
} = require('../validators/authValidator');

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:     { type: string, example: "Jane Doe" }
 *               email:    { type: string, format: email, example: "jane@example.com" }
 *               password: { type: string, example: "Secret@99" }
 *               role:     { type: string, enum: [user, admin], default: user }
 *     responses:
 *       201:
 *         description: Account created – returns user + tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 user:    { $ref: '#/components/schemas/UserPublic' }
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     accessToken:  { type: string }
 *                     refreshToken: { type: string }
 *       400: { description: Validation error }
 *       409: { description: Email already exists }
 */
router.post('/register', registerValidator, validate, ctrl.register);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in with email & password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email, example: "demo@taskflow.dev" }
 *               password: { type: string, example: "Demo@1234" }
 *     responses:
 *       200:
 *         description: Login successful – returns user + tokens
 *       401: { description: Invalid credentials }
 */
router.post('/login', loginValidator, validate, ctrl.login);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Rotate tokens using a refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New access + refresh tokens }
 *       401: { description: Invalid or expired refresh token }
 */
router.post('/refresh', refreshValidator, validate, ctrl.refresh);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out (revoke the provided refresh token)
 *     tags: [Auth]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', ctrl.logout);

/**
 * @swagger
 * /api/v1/auth/logout-all:
 *   post:
 *     summary: Log out from all devices
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200: { description: All sessions revoked }
 *       401: { description: Unauthorized }
 */
router.post('/logout-all', authenticate, ctrl.logoutAll);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/UserPublic' }
 *       401: { description: Unauthorized }
 *   patch:
 *     summary: Update current user profile
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:     { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Updated profile }
 *       401: { description: Unauthorized }
 */
router.get('/me',   authenticate, ctrl.me);
router.patch('/me', authenticate, ctrl.updateMe);

module.exports = router;
