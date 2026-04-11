// GitHub usernames and repo names: alphanumeric, hyphens, underscores, dots only
const SAFE_PATTERN = /^[a-zA-Z0-9._-]+$/;
const MAX_PARAM_LENGTH = 100;
const MAX_QUERY_LENGTH = 200;

/**
 * Validates :owner and :repo route parameters before passing to GitHub API.
 * @param {string} owner
 * @param {string} repo
 * @returns {{ valid: boolean, message?: string }}
 */
const validateRepoParams = (owner, repo) => {
  if (!owner || !repo) {
    return { valid: false, message: 'Owner and repository name are required' };
  }

  if (!SAFE_PATTERN.test(owner) || !SAFE_PATTERN.test(repo)) {
    return { valid: false, message: 'Invalid repository or owner name format' };
  }

  if (owner.length > MAX_PARAM_LENGTH || repo.length > MAX_PARAM_LENGTH) {
    return { valid: false, message: 'Owner or repository name is too long' };
  }

  return { valid: true };
};

/**
 * Validates and sanitizes a search query string.
 * @param {string} q
 * @returns {{ valid: boolean, sanitized?: string, message?: string }}
 */
const validateSearchQuery = (q) => {
  if (!q || typeof q !== 'string') {
    return { valid: false, message: 'Search query is required' };
  }

  if (q.length > MAX_QUERY_LENGTH) {
    return { valid: false, message: 'Search query is too long' };
  }

  // Strip any characters that are not safe for a GitHub search query
  const sanitized = q.replace(/[<>'"`;]/g, '').trim();

  return { valid: true, sanitized };
};

module.exports = { validateRepoParams, validateSearchQuery };
