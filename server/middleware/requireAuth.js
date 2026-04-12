const { getSession } = require('../utils/sessions');

const requireAuth = (req, res, next) => {
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token && req.cookies?.session_id) {
    token = req.cookies.session_id;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Please sign in' });
  }

  const session = getSession(token);
  if (!session) {
    res.clearCookie('session_id');
    return res.status(401).json({ error: 'Session expired', message: 'Please sign in again' });
  }

  session.lastAccessed = Date.now();
  req.session = session;
  req.accessToken = session.accessToken;
  req.username = session.username;
  next();
};

module.exports = { requireAuth };
