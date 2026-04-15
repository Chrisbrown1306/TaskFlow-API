/**
 * Global error-handling middleware.
 * Must be registered LAST in the Express app (after all routes).
 */
const errorHandler = (err, req, res, next) => {      // eslint-disable-line no-unused-vars
  const isDev = process.env.NODE_ENV !== 'production';

  // Log full error in dev; keep it clean in prod
  if (isDev) {
    console.error('❌ Unhandled error:', err);
  } else {
    console.error(`[${new Date().toISOString()}] ${err.message}`);
  }

  // SQLite unique constraint
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      message: 'A record with that value already exists.',
    });
  }

  // SQLite general
  if (err.code?.startsWith('SQLITE_')) {
    return res.status(500).json({
      success: false,
      message: 'A database error occurred.',
    });
  }

  const status  = err.statusCode || err.status || 500;
  const message = status < 500
    ? err.message
    : isDev ? err.message : 'Internal server error';

  res.status(status).json({
    success: false,
    message,
    ...(isDev && status === 500 && { stack: err.stack }),
  });
};

/**
 * 404 catcher – register before errorHandler.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
};

module.exports = { errorHandler, notFoundHandler };
