const axios = require('axios');

const COMMIT_FALLBACK_MAX_PAGES = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createWeeklyBuckets() {
  return Array.from({ length: 12 }, () => ({ c: 0 }));
}

function getResponseLatencyScore(pulls, login) {
  const contributorPulls = pulls.filter((pr) => pr.user?.login === login);
  const resolvedPulls = contributorPulls.filter((pr) => pr.created_at && (pr.merged_at || pr.closed_at));

  if (resolvedPulls.length === 0) return 75;

  const averageHours = resolvedPulls.reduce((sum, pr) => {
    const start = new Date(pr.created_at).getTime();
    const end = new Date(pr.merged_at || pr.closed_at).getTime();
    const hours = Math.max(1, (end - start) / (1000 * 60 * 60));
    return sum + hours;
  }, 0) / resolvedPulls.length;

  const normalized = 100 - Math.min(100, Math.round((averageHours / 168) * 100));
  return Math.max(15, normalized);
}

async function fetchContributorStats(owner, repo, config) {
  let statsResponse;

  for (let i = 0; i < 3; i++) {
    statsResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/stats/contributors`,
      config
    );

    if (statsResponse.status !== 202) break;
    await sleep(2000);
  }

  if (statsResponse?.status === 200 && Array.isArray(statsResponse.data)) {
    return statsResponse.data;
  }

  return null;
}

async function fetchRecentCommitFallback(owner, repo, config) {
  const contributors = new Map();
  const perPage = 100;
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  for (let page = 1; page <= COMMIT_FALLBACK_MAX_PAGES; page++) {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${page}`,
      config
    );

    const commits = Array.isArray(response.data) ? response.data : [];
    if (commits.length === 0) break;

    for (const commit of commits) {
      const login = commit.author?.login;
      const avatarUrl = commit.author?.avatar_url;
      const committedAt = commit.commit?.author?.date;
      if (!login || !avatarUrl || !committedAt) continue;

      const ageMs = now - new Date(committedAt).getTime();
      if (ageMs < 0 || ageMs >= 12 * weekMs) continue;

      const weekIndex = 11 - Math.floor(ageMs / weekMs);
      if (weekIndex < 0 || weekIndex > 11) continue;

      if (!contributors.has(login)) {
        contributors.set(login, {
          author: { login, avatar_url: avatarUrl },
          total: 0,
          weeks: createWeeklyBuckets(),
        });
      }

      const contributor = contributors.get(login);
      contributor.total += 1;
      contributor.weeks[weekIndex].c += 1;
    }

    if (commits.length < perPage) break;
  }

  return Array.from(contributors.values());
}

module.exports = {
  getResponseLatencyScore,
  fetchContributorStats,
  fetchRecentCommitFallback,
};
