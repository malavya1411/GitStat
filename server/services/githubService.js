const axios = require('axios');

const GITHUB_API_TIMEOUT_MS = 8000;

// Abort-controller wrapper — rejects after timeoutMs with a structured error
async function fetchWithTimeout(url, config, timeoutMs = GITHUB_API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await axios.get(url, { ...config, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.code === 'ERR_CANCELED' || err.name === 'AbortError' || (err.message && err.message.includes('abort'))) {
      const timeoutErr = new Error('GitHub API took too long. Try a smaller repository.');
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const getGithubConfig = (accessToken) => ({
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'GitStat-App',
  },
});

module.exports = { fetchWithTimeout, getGithubConfig, GITHUB_API_TIMEOUT_MS };
