const { validationResult } = require('express-validator');
const { badRequest } = require('../utils/response');

/**
 * validate
 * Runs after an array of express-validator checks.
 * If any check failed it returns a 400 with structured error details.
 * Otherwise passes control to the next handler.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formatted = errors.array().map(err => ({
      field:   err.path || err.param,
      message: err.msg,
      value:   err.value,
    }));
    return badRequest(res, 'Validation failed. Please check the highlighted fields.', formatted);
  }

  next();
};

module.exports = { validate };
