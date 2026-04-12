const { sessions, getSessionIdFromRequest } = require('../utils/sessions');

const requireAuth = (req, res, next) => {
  const sessionId = getSessionIdFromRequest(req);

  if (!sessionId) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Please sign in with GitHub to continue' 
    });
  }
  
  const session = sessions[sessionId];
  
  if (!session) {
    res.clearCookie('session_id');
    return res.status(401).json({ 
      error: 'Session expired', 
      message: 'Your session has expired. Please sign in again.' 
    });
  }
  
  // Update last accessed timestamp
  session.lastAccessed = Date.now();
  
  // Attach session data to request for use in route handlers
  req.session = session;
  req.accessToken = session.accessToken;
  req.username = session.username;
  
  next();
};

module.exports = { requireAuth };
