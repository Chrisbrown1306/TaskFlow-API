require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const swaggerUi  = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// ── Security & parsing ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: +(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  max:      +(process.env.RATE_LIMIT_MAX        || 100),
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests – slow down and try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Please wait 15 minutes.' },
});
app.use(limiter);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',  authLimiter, require('./routes/authRoutes'));
app.use('/api/v1/tasks',             require('./routes/taskRoutes'));
app.use('/api/v1/admin',             require('./routes/adminRoutes'));

// ── Swagger docs ──────────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'TaskFlow API Docs',
  customCss: '.swagger-ui .topbar { background: #0f172a; } .swagger-ui .topbar-wrapper img { content: url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 30\'><text y=\'22\' font-size=\'18\' fill=\'white\' font-weight=\'bold\'>TaskFlow</text></svg>"); }',
  swaggerOptions: { persistAuthorization: true },
}));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) =>
  res.json({ success: true, status: 'healthy', uptime: process.uptime(), timestamp: new Date() })
);

// ── 404 + Global error handler ────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║        TaskFlow API  –  v1.0.0       ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`\n🚀  Server:   http://localhost:${PORT}`);
  console.log(`📚  Docs:     http://localhost:${PORT}/api/docs`);
  console.log(`❤️   Health:   http://localhost:${PORT}/health`);
  console.log(`🌍  ENV:      ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
