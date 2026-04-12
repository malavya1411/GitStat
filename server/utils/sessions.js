// In-memory session store — single shared instance for the process
const sessions = Object.create(null); // null prototype prevents prototype-pollution

// Session cleanup interval — runs every 30 minutes, expires sessions older than 1 hour
const SESSION_MAX_AGE_MS = 60 * 60 * 1000;       // 1 hour
const SESSION_CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Validates session ID format: 64-character lowercase hex string
const SESSION_ID_RE = /^[0-9a-f]{64}$/;

const isValidSessionId = (id) => typeof id === 'string' && SESSION_ID_RE.test(id);

// Extract and validate a session ID from a request (Bearer header first, then cookie)
const getSessionIdFromRequest = (req) => {
  const authHeader = req.headers && req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (isValidSessionId(token)) return token;
  }
  const cookieId = req.cookies && req.cookies.session_id;
  if (isValidSessionId(cookieId)) return cookieId;
  return null;
};

// Returns a shallow copy of the sessions map (useful for diagnostics, read-only)
const getSessions = () => ({ ...sessions });

// Create or overwrite a session entry
const createSession = (sessionId, data) => {
  sessions[sessionId] = {
    ...data,
    createdAt: Date.now(),
    lastAccessed: Date.now(),
  };
};

// Retrieve a session by ID, or null if not found
const getSession = (sessionId) => sessions[sessionId] || null;

// Remove a session by ID
const deleteSession = (sessionId) => {
  delete sessions[sessionId];
};

const cleanExpiredSessions = () => {
  const cutoff = Date.now() - SESSION_MAX_AGE_MS;
  Object.keys(sessions).forEach(id => {
    if (sessions[id].createdAt < cutoff) {
      delete sessions[id];
    }
  });
};

const startSessionCleanup = () => {
  setInterval(cleanExpiredSessions, SESSION_CLEANUP_INTERVAL_MS);
};

module.exports = {
  sessions,
  getSessions,
  createSession,
  getSession,
  deleteSession,
  cleanExpiredSessions,
  startSessionCleanup,
  SESSION_MAX_AGE_MS,
  getSessionIdFromRequest,
};
