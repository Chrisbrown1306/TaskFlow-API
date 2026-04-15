/**
 * Centralised HTTP response helpers.
 * Keeps controller code clean and ensures a consistent envelope shape.
 */

const send = (res, statusCode, success, message, data = {}) =>
  res.status(statusCode).json({ success, message, ...data });

const ok          = (res, message, data)  => send(res, 200, true,  message, data);
const created     = (res, message, data)  => send(res, 201, true,  message, data);
const noContent   = (res)                 => res.status(204).send();
const badRequest  = (res, message, errors) =>
  send(res, 400, false, message, errors ? { errors } : {});
const unauthorized = (res, message = 'Unauthorized – please log in') =>
  send(res, 401, false, message);
const forbidden   = (res, message = 'Forbidden – insufficient permissions') =>
  send(res, 403, false, message);
const notFound    = (res, message = 'Resource not found') =>
  send(res, 404, false, message);
const conflict    = (res, message) => send(res, 409, false, message);
const serverError = (res, message = 'Internal server error') =>
  send(res, 500, false, message);

module.exports = {
  ok, created, noContent,
  badRequest, unauthorized, forbidden, notFound, conflict, serverError,
};
