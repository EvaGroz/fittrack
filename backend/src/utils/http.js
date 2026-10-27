// Error with an HTTP status, picked up by the central error handler.
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Forwards rejected promises from async route handlers to the error handler.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Returns the Monday (00:00 UTC) of the week containing the given date.
function mondayOf(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const dayIndex = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayIndex);
  return d;
}

// Accepts either an id or a populated document ({ _id }).
function toId(value) {
  if (value && typeof value === 'object' && value._id) return value._id;
  return value;
}

module.exports = { httpError, asyncHandler, escapeRegex, mondayOf, toId };
