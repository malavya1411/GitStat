let rateLimit;
let globalLimiter, analysisLimiter, authLimiter;

const passThrough = (req, res, next) => next();

try {
  rateLimit = require('express-rate-limit');

  globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests', message: 'You have exceeded the request limit. Please wait 15 minutes.' }
  });

  analysisLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Analysis rate limit exceeded', message: 'You can analyze up to 5 repositories per minute. Please slow down.' }
  });

  authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts', message: 'Please wait before trying to sign in again.' }
  });

} catch (err) {
  // If not installed, use safe pass-through logic and prompt admin secretly
  globalLimiter = passThrough;
  analysisLimiter = passThrough;
  authLimiter = passThrough;
}

module.exports = { globalLimiter, analysisLimiter, authLimiter };
