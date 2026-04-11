const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/requireAuth');
const { validateRepoParams, validateSearchQuery } = require('../utils/validate');
const { getGithubConfig, fetchWithTimeout } = require('../services/githubService');
const { fetchContributorStats, fetchRecentCommitFallback, getResponseLatencyScore } = require('../utils/analysis');

const router = express.Router();
const REPO_TREE_MAX_ITEMS = 500;
const BUS_FACTOR_CONCURRENCY = 10;
const BUS_FACTOR_MAX_BLOBS = 40;

// Search repositories
router.get('/search-repos', requireAuth, async (req, res) => {
  const { valid, sanitized, message } = validateSearchQuery(req.query.q);
  if (!valid) return res.status(400).json({ error: message });

  try {
    const response = await axios.get(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(sanitized)}&sort=stars&per_page=20`,
      getGithubConfig(req.accessToken)
    );
    const repos = response.data.items.map(repo => ({
      full_name: repo.full_name,
      description: repo.description,
      stargazers_count: repo.stargazers_count,
      language: repo.language,
      owner: { avatar_url: repo.owner.avatar_url },
    }));
    res.json(repos);
  } catch (error) {
    if (error.response?.status === 403) return res.status(403).json({ error: 'GitHub API rate limit exceeded' });
    res.status(500).json({ error: 'Failed to search repositories' });
  }
});

// User's own repos
router.get('/repos', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.github.com/user/repos?per_page=100&sort=updated&type=all',
      getGithubConfig(req.accessToken)
    );
    const repos = response.data.map(r => ({
      full_name: r.full_name,
      name: r.name,
      description: r.description,
      stargazers_count: r.stargazers_count,
      language: r.language,
      updated_at: r.updated_at,
      private: r.private,
      owner: { login: r.owner.login, avatar_url: r.owner.avatar_url },
    }));
    res.json(repos);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Analyze repo contributors
router.get('/repo/:owner/:repo/analyze', requireAuth, async (req, res, next) => {
  const { owner, repo } = req.params;
  const paramCheck = validateRepoParams(owner, repo);
  if (!paramCheck.valid) return res.status(400).json({ error: paramCheck.message });

  const config = getGithubConfig(req.accessToken);

  try {
    await axios.get(`https://api.github.com/repos/${owner}/${repo}`, config);
  } catch (err) {
    if (err.response?.status === 404) return res.status(404).json({ error: 'Repository not found' });
    if (err.response?.status === 403) return res.status(403).json({ error: 'Repository access forbidden' });
    return res.status(500).json({ error: 'Failed to load repository basic info' });
  }

  try {
    let contributors = await fetchContributorStats(owner, repo, config);
    if (!contributors) contributors = await fetchRecentCommitFallback(owner, repo, config);
    if (!Array.isArray(contributors)) contributors = [];

    contributors.sort((a, b) => b.total - a.total);
    const topContributors = contributors.slice(0, 25);

    const pullsResponse = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`,
      config
    );
    const pulls = pullsResponse.data;

    let punchCardResponse;
    try {
      punchCardResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/stats/punch_card`,
        config
      );
    } catch {
      punchCardResponse = { data: [] };
    }

    let punchCards = punchCardResponse.data;
    if (!Array.isArray(punchCards)) punchCards = [];

    let totalCommitsPunch = 0;
    let offhoursCommits = 0;

    for (let entry of punchCards) {
      const [day, hour, commits] = entry;
      totalCommitsPunch += commits;
      if (hour <= 5 || hour >= 23 || day === 0) offhoursCommits += commits;
    }

    const fallbackPunchTotal = contributors.reduce(
      (sum, contributor) => sum + contributor.weeks.reduce((acc, week) => acc + week.c, 0),
      0
    );
    const offhours_ratio = totalCommitsPunch === 0 ? 0 : offhoursCommits / totalCommitsPunch;
    const offhours_score = Math.round((1 - offhours_ratio) * 100);
    const normalizedOffhoursScore = totalCommitsPunch === 0 && fallbackPunchTotal > 0 ? 100 : offhours_score;

    const results = [];
    for (let cont of topContributors) {
      const weeks = Math.max(0, cont.weeks.length - 12);
      const last12 = cont.weeks.slice(weeks);

      let recentCommitsTotal = 0;
      let priorCommitsTotal = 0;

      for (let i = 0; i < last12.length; i++) {
        if (i >= 8 && i <= 11) recentCommitsTotal += last12[i].c;
        if (i >= 4 && i <= 7) priorCommitsTotal += last12[i].c;
      }

      const recent = recentCommitsTotal / 4;
      const prior = priorCommitsTotal / 4;
      const trend = (recent - prior) / Math.max(prior, 1);
      const velocity_score = Math.round(Math.min(100, Math.max(0, 50 + trend * 50)));

      let current_streak = 0;
      let peak_streak = 0;
      let c_streak = 0;

      for (let i = 0; i < last12.length; i++) {
        if (last12[i].c > 0) {
          c_streak++;
          if (c_streak > peak_streak) peak_streak = c_streak;
        } else {
          c_streak = 0;
        }
      }

      for (let i = last12.length - 1; i >= 0; i--) {
        if (last12[i].c > 0) current_streak++;
        else break;
      }

      const streak_score = Math.round((current_streak / Math.max(peak_streak, 1)) * 100);

      let prs_opened = 0;
      let prs_merged = 0;
      for (let pr of pulls) {
        if (pr.user.login === cont.author.login) {
          prs_opened++;
          if (pr.merged_at) prs_merged++;
        }
      }
      const pr_followthrough = prs_opened === 0 ? 1.0 : prs_merged / prs_opened;
      const pr_score = Math.round(pr_followthrough * 100);
      const response_latency_score = getResponseLatencyScore(pulls, cont.author.login);

      const health_score = Math.round(
        velocity_score * 0.28 +
        streak_score * 0.22 +
        pr_score * 0.18 +
        normalizedOffhoursScore * 0.14 +
        response_latency_score * 0.18
      );

      const total12Weeks = last12.reduce((acc, w) => acc + w.c, 0);
      if (total12Weeks > 0) {
        results.push({
          login: cont.author.login,
          avatar_url: cont.author.avatar_url,
          total_commits: cont.total,
          health_score,
          velocity_score,
          streak_score,
          pr_score,
          offhours_score: normalizedOffhoursScore,
          response_latency_score,
          current_streak,
          peak_streak,
          prs_opened,
          prs_merged,
          weekly_commits: last12.map(w => w.c),
        });
      }
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Basic repo info
router.get('/repo-info/:owner/:repo', requireAuth, async (req, res, next) => {
  const { owner, repo } = req.params;
  const paramCheck = validateRepoParams(owner, repo);
  if (!paramCheck.valid) return res.status(400).json({ error: paramCheck.message });

  try {
    const r = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, getGithubConfig(req.accessToken));
    const { default_branch, description, stargazers_count, forks_count, open_issues_count, language } = r.data;
    res.json({ default_branch, description, stargazers_count, forks_count, open_issues_count, language });
  } catch (err) {
    next(err);
  }
});

// Full recursive file tree
router.get('/repo-tree/:owner/:repo', requireAuth, async (req, res, next) => {
  const { owner, repo } = req.params;
  const paramCheck = validateRepoParams(owner, repo);
  if (!paramCheck.valid) return res.status(400).json({ error: paramCheck.message });

  const branch = req.query.branch || 'HEAD';
  const config = getGithubConfig(req.accessToken);
  try {
    let r;
    try {
      r = await fetchWithTimeout(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        config
      );
    } catch (timeoutErr) {
      if (timeoutErr.isTimeout) return res.status(408).json({ error: 'timeout', message: timeoutErr.message });
      throw timeoutErr;
    }

    const rawTree = r.data.tree || [];
    const githubTruncated = r.data.truncated || false;

    if (githubTruncated || rawTree.length > REPO_TREE_MAX_ITEMS) {
      const blobs = rawTree.filter(n => n.type === 'blob').slice(0, REPO_TREE_MAX_ITEMS);
      return res.json({ tree: blobs, truncated: true, sampledCount: blobs.length, totalEstimate: rawTree.length || '500+' });
    }

    res.json({ tree: rawTree, truncated: false });
  } catch (err) {
    next(err);
  }
});

// Pull requests proxy
router.get('/repo/:owner/:repo/pulls', requireAuth, async (req, res, next) => {
  const { owner, repo } = req.params;
  const paramCheck = validateRepoParams(owner, repo);
  if (!paramCheck.valid) return res.status(400).json({ error: paramCheck.message });

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`,
      getGithubConfig(req.accessToken)
    );
    const pulls = response.data.map(pr => ({
      number: pr.number,
      title: pr.title,
      html_url: pr.html_url,
      state: pr.state,
      merged_at: pr.merged_at,
      created_at: pr.created_at,
      closed_at: pr.closed_at,
      user: { login: pr.user.login, avatar_url: pr.user.avatar_url },
      commits: pr.commits || null,
    }));
    res.json(pulls);
  } catch (error) {
    next(error);
  }
});

// Deployments proxy
router.get('/repo/:owner/:repo/deployments', requireAuth, async (req, res, next) => {
  const { owner, repo } = req.params;
  const paramCheck = validateRepoParams(owner, repo);
  if (!paramCheck.valid) return res.status(400).json({ error: paramCheck.message });
  const config = getGithubConfig(req.accessToken);

  try {
    const depRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/deployments?per_page=50`, config);
    const enriched = await Promise.all(
      depRes.data.map(async (dep) => {
        let latestStatus = null;
        try {
          const statusRes = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/deployments/${dep.id}/statuses?per_page=1`,
            config
          );
          latestStatus = statusRes.data[0] || null;
        } catch { /* ignore individual status errors */ }
        return {
          id: dep.id,
          ref: dep.ref,
          environment: dep.environment,
          created_at: dep.created_at,
          creator: { login: dep.creator?.login, avatar_url: dep.creator?.avatar_url },
          status: latestStatus?.state || 'pending',
          status_description: latestStatus?.description || '',
        };
      })
    );
    res.json(enriched);
  } catch (error) {
    next(error);
  }
});

// Repo file query
router.get('/repo-file/:owner/:repo', requireAuth, async (req, res, next) => {
  const { owner, repo } = req.params;
  const paramCheck = validateRepoParams(owner, repo);
  if (!paramCheck.valid) return res.status(400).json({ error: paramCheck.message });

  const path = req.query.path;
  if (!path) return res.status(400).json({ error: 'path query param required' });

  try {
    const r = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      getGithubConfig(req.accessToken)
    );
    const content = r.data.encoding === 'base64'
      ? Buffer.from(r.data.content, 'base64').toString('utf-8')
      : r.data.content;
    res.json({ content, sha: r.data.sha, size: r.data.size });
  } catch (err) {
    next(err);
  }
});

// Good first issue query
router.get('/good-first-issues/:owner/:repo', requireAuth, async (req, res) => {
  const { owner, repo } = req.params;
  const paramCheck = validateRepoParams(owner, repo);
  if (!paramCheck.valid) return res.status(400).json({ error: paramCheck.message });

  try {
    const r = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/issues?labels=good+first+issue&state=open&per_page=1`,
      getGithubConfig(req.accessToken)
    );
    const linkHeader = r.headers.link || '';
    let count = r.data.length;
    const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
    if (lastMatch) count = parseInt(lastMatch[1], 10);
    res.json({ count });
  } catch {
    res.json({ count: 0 });
  }
});

// Bus Factor Heatmap
router.get('/repo/:owner/:repo/bus-factor', requireAuth, async (req, res, next) => {
  const { owner, repo } = req.params;
  const paramCheck = validateRepoParams(owner, repo);
  if (!paramCheck.valid) return res.status(400).json({ error: paramCheck.message });

  const config = getGithubConfig(req.accessToken);

  try {
    const repoInfo = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}`, config);
    const defaultBranch = repoInfo.data.default_branch;

    let treeRes;
    try {
      treeRes = await fetchWithTimeout(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
        config
      );
    } catch (err) {
      if (err.isTimeout) return res.status(408).json({ error: 'timeout', message: err.message });
      throw err;
    }

    const rawTree = treeRes.data.tree || [];
    const blobs = rawTree.filter(t => t.type === 'blob').slice(0, BUS_FACTOR_MAX_BLOBS);
    const isTruncated = treeRes.data.truncated || rawTree.length > 500;

    let totalFilesAnalyzed = 0;
    let singleContributorFiles = 0;
    const heatmap = [];

    // Process in parallel batches to reduce latency
    for (let i = 0; i < blobs.length; i += BUS_FACTOR_CONCURRENCY) {
      const batch = blobs.slice(i, i + BUS_FACTOR_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (f) => {
          try {
            const commitsRes = await fetchWithTimeout(
              `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(f.path)}&per_page=10`,
              config
            );
            const uniqueAuthors = new Set();
            for (let c of commitsRes.data) {
              if (c.author?.login) uniqueAuthors.add(c.author.login);
              else if (c.commit?.author) uniqueAuthors.add(c.commit.author.name);
            }
            return { success: true, count: uniqueAuthors.size, path: f.path };
          } catch (fileErr) {
            return { success: false, timeout: !!fileErr.isTimeout };
          }
        })
      );

      let timeoutEncountered = false;
      for (const result of batchResults) {
        if (!result.success) {
          if (result.timeout) timeoutEncountered = true;
          continue;
        }
        totalFilesAnalyzed++;
        if (result.count === 1) singleContributorFiles++;
        heatmap.push({
          path: result.path,
          unique_contributors: result.count,
          risk: result.count === 1 ? 'high' : (result.count === 2 ? 'medium' : 'low'),
        });
      }

      if (timeoutEncountered) break;
    }

    const bus_factor_score = totalFilesAnalyzed === 0
      ? 100
      : Math.round(((totalFilesAnalyzed - singleContributorFiles) / totalFilesAnalyzed) * 100);

    res.json({ bus_factor_score, heatmap, truncated: isTruncated, sampledCount: blobs.length });
  } catch (error) {
    if (error.isTimeout) return res.status(408).json({ error: 'timeout', message: error.message });
    next(error);
  }
});

module.exports = router;
