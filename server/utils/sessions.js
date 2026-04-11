// In-memory session store
const sessions = {};

// Session cleanup interval — runs every 30 minutes, expires sessions older than 1 hour
const SESSION_MAX_AGE_MS = 60 * 60 * 1000;       // 1 hour
const SESSION_CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

const startSessionCleanup = () => {
  setInterval(() => {
    const cutoff = Date.now() - SESSION_MAX_AGE_MS;
    Object.keys(sessions).forEach(id => {
      if (sessions[id].createdAt < cutoff) {
        delete sessions[id];
      }
    });
  }, SESSION_CLEANUP_INTERVAL_MS);
};

module.exports = { sessions, startSessionCleanup, SESSION_MAX_AGE_MS };
