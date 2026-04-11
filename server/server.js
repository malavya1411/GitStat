const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// In-memory sessions store
// sessions[sessionId] = { accessToken, username, avatarUrl }
const sessions = {};

// GitHub app configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createWeeklyBuckets() {
  return Array.from({ length: 12 }, () => ({ c: 0 }));
}

function getResponseLatencyScore(pulls, login) {
  const contributorPulls = pulls.filter((pr) => pr.user?.login === login);
  const resolvedPulls = contributorPulls.filter((pr) => pr.created_at && (pr.merged_at || pr.closed_at));

  if (resolvedPulls.length === 0) {
    return 75;
  }

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
  const maxPages = 5;
  const perPage = 100;
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  for (let page = 1; page <= maxPages; page++) {
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
          weeks: createWeeklyBuckets()
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

// Helper to get session from request
function getSession(req) {
  const sessionId = req.cookies.session_id;
  if (!sessionId) return null;
  return sessions[sessionId] || null;
}

// Ensure the request is authorized via GitHub User Agent
const getGithubConfig = (accessToken) => ({
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'User-Agent': 'GitStat-App'
  }
});

const getAiClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

// OAuth Callback Route
app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${BACKEND_URL}/auth/callback`
      },
      {
        headers: { Accept: 'application/json' }
      }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new Error('Failed to get access token');
    }

    // 2. Fetch user profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'GitStat-App'
      }
    });

    const { login: username, avatar_url: avatarUrl } = userResponse.data;

    // 3. Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    sessions[sessionId] = { accessToken, username, avatarUrl };

    // 4. Set cookie and redirect
    res.cookie('session_id', sessionId, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.redirect(`${FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('OAuth Error:', error.message);
    res.status(500).send('Authentication failed');
  }
});

// Get current logged-in user
app.get('/api/me', (req, res) => {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  
  res.json({
    username: session.username,
    avatarUrl: session.avatarUrl
  });
});

// Logout
app.get('/auth/logout', (req, res) => {
  const sessionId = req.cookies.session_id;
  if (sessionId) {
    delete sessions[sessionId];
    res.clearCookie('session_id');
  }
  res.redirect(FRONTEND_URL);
});

// Proxy route for Search Repos
app.get('/api/search-repos', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Query parameter "q" is required' });

  try {
    const response = await axios.get(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=20`,
      getGithubConfig(session.accessToken)
    );
    
    // Transform data to return what frontend needs
    const repos = response.data.items.map(repo => ({
      full_name: repo.full_name,
      description: repo.description,
      stargazers_count: repo.stargazers_count,
      language: repo.language,
      owner: { avatar_url: repo.owner.avatar_url }
    }));
    
    res.json(repos);
  } catch (error) {
    console.error('Search Repos Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to search repositories' });
  }
});

// Proxy route to analyze repo contributors
app.get('/api/repo/:owner/:repo/analyze', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });

  const { owner, repo } = req.params;
  const config = getGithubConfig(session.accessToken);
  
  try {
    // Basic permissions check by just getting repo basic info and catching 404/403
    await axios.get(`https://api.github.com/repos/${owner}/${repo}`, config);
  } catch (err) {
    if (err.response?.status === 404) return res.status(404).json({ error: 'Repository not found' });
    if (err.response?.status === 403) return res.status(403).json({ error: 'Repository access forbidden' });
    return res.status(500).json({ error: 'Failed to load repository basic info' });
  }

  try {
    let contributors = await fetchContributorStats(owner, repo, config);
    if (!contributors) {
      contributors = await fetchRecentCommitFallback(owner, repo, config);
    }
    if (!Array.isArray(contributors)) contributors = [];
    
    // Sort by descending commits, take top 25
    contributors.sort((a, b) => b.total - a.total);
    const topContributors = contributors.slice(0, 25);
    
    // Step 2 & 3 in parallel
    // PR data
    const pullsResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`, config);
    const pulls = pullsResponse.data;
    
    // Punch card (commit timing)
    let punchCardResponse;
    try {
        punchCardResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/stats/punch_card`, config);
    } catch(err) {
        // If punchcard fails, assume empty
        punchCardResponse = { data: [] };
    }
    
    let punchCards = punchCardResponse.data;
    if (!Array.isArray(punchCards)) punchCards = [];

    // Calculate generic offhours ratio across the entire repository (as per punch card data)
    let totalCommitsPunch = 0;
    let offhoursCommits = 0;
    
    for (let entry of punchCards) {
      const [day, hour, commits] = entry;
      totalCommitsPunch += commits;
      if (hour <= 5 || hour >= 23 || day === 0) {
        offhoursCommits += commits;
      }
    }
    const fallbackPunchTotal = contributors.reduce(
      (sum, contributor) => sum + contributor.weeks.reduce((acc, week) => acc + week.c, 0),
      0
    );
    const offhours_ratio = totalCommitsPunch === 0 ? 0 : offhoursCommits / totalCommitsPunch;
    const offhours_score = Math.round((1 - offhours_ratio) * 100);
    const normalizedOffhoursScore = totalCommitsPunch === 0 && fallbackPunchTotal > 0 ? 100 : offhours_score;

    // Compute metrics
    const results = [];
    for (let cont of topContributors) {
        // Filter weeks data to last 12
        const weeks = Math.max(0, cont.weeks.length - 12);
        const last12 = cont.weeks.slice(weeks);
        
        let recentCommitsTotal = 0;
        let priorCommitsTotal = 0;
        
        // weeks[0] to [3] is "prior" (weeks 5-8 from end out of 1-12)
        // weeks[8] to [11] is "recent" (weeks 9-12 from end -> earliest relative to current)
        
        // Let's iterate backwards. 
        // 12 weeks total. Index 8,9,10,11 = recent (last 4 weeks). Index 4,5,6,7 = prior (weeks 5 to 8 ago). 
        // Index 0,1,2,3 = even earlier.
        
        for (let i = 0; i < last12.length; i++) {
           if (i >= 8 && i <= 11) recentCommitsTotal += last12[i].c;
           if (i >= 4 && i <= 7) priorCommitsTotal += last12[i].c;
        }
        
        const recent = recentCommitsTotal / 4;
        const prior = priorCommitsTotal / 4;
        const trend = (recent - prior) / Math.max(prior, 1);
        const velocity_score = Math.round(Math.min(100, Math.max(0, 50 + trend * 50)));
        
        // Streak score computation
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
        
        // compute current streak by iterating backwards
        for (let i = last12.length - 1; i >= 0; i--) {
           if (last12[i].c > 0) current_streak++;
           else break;
        }
        
        const streak_score = Math.round((current_streak / Math.max(peak_streak, 1)) * 100);
        
        // PR computation
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
        
        // Final Health Score
        const health_score = Math.round(
          velocity_score * 0.28 +
          streak_score * 0.22 +
          pr_score * 0.18 +
          normalizedOffhoursScore * 0.14 +
          response_latency_score * 0.18
        );
        
        // Only valid if > 0 commits in last 12 weeks
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
               weekly_commits: last12.map(w => w.c)
            });
        }
    }

    res.json(results);
  } catch (error) {
    console.error('Analyze Repo Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to analyze repository' });
  }
});

// User's own repos
app.get('/api/repos', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  try {
    const response = await axios.get(
      'https://api.github.com/user/repos?per_page=100&sort=updated&type=all',
      getGithubConfig(session.accessToken)
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
    console.error('Repos Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch repositories' });
  }
});

// Pull requests proxy
app.get('/api/repo/:owner/:repo/pulls', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const { owner, repo } = req.params;
  const config = getGithubConfig(session.accessToken);
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`,
      config
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
    console.error('Pulls Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch pull requests' });
  }
});

// Deployments proxy
app.get('/api/repo/:owner/:repo/deployments', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const { owner, repo } = req.params;
  const config = getGithubConfig(session.accessToken);
  try {
    const depRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/deployments?per_page=50`,
      config
    );
    const deployments = depRes.data;
    // Fetch latest status for each deployment
    const enriched = await Promise.all(
      deployments.map(async (dep) => {
        let latestStatus = null;
        try {
          const statusRes = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/deployments/${dep.id}/statuses?per_page=1`,
            config
          );
          latestStatus = statusRes.data[0] || null;
        } catch { /* ignore */ }
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
    console.error('Deployments Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch deployments' });
  }
});

// ─── Architecture Section Routes ────────────────────────────────

// Basic repo info (default branch, description, etc.)
app.get('/api/repo-info/:owner/:repo', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const { owner, repo } = req.params;
  try {
    const r = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, getGithubConfig(session.accessToken));
    const { default_branch, description, stargazers_count, forks_count, open_issues_count, language } = r.data;
    res.json({ default_branch, description, stargazers_count, forks_count, open_issues_count, language });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch repo info' });
  }
});

// Full recursive file tree via git trees API
app.get('/api/repo-tree/:owner/:repo', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const { owner, repo } = req.params;
  const branch = req.query.branch || 'HEAD';
  try {
    const r = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      getGithubConfig(session.accessToken)
    );
    // Return truncated-flag + tree array
    res.json({ tree: r.data.tree || [], truncated: r.data.truncated || false });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch repo tree' });
  }
});

// Fetch a single file's contents (base64-decoded)
app.get('/api/repo-file/:owner/:repo', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const { owner, repo } = req.params;
  const path = req.query.path;
  if (!path) return res.status(400).json({ error: 'path query param required' });
  try {
    const r = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
      getGithubConfig(session.accessToken)
    );
    const content = r.data.encoding === 'base64'
      ? Buffer.from(r.data.content, 'base64').toString('utf-8')
      : r.data.content;
    res.json({ content, sha: r.data.sha, size: r.data.size });
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch file' });
  }
});

// Good first issue count
app.get('/api/good-first-issues/:owner/:repo', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const { owner, repo } = req.params;
  try {
    const r = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/issues?labels=good+first+issue&state=open&per_page=1`,
      getGithubConfig(session.accessToken)
    );
    // GitHub returns total via Link header; use array length as minimum
    const linkHeader = r.headers.link || '';
    let count = r.data.length;
    const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
    if (lastMatch) count = parseInt(lastMatch[1], 10);
    res.json({ count });
  } catch (err) {
    res.json({ count: 0 });
  }
});

// ──────────────────────────────────────────────────────────────────

// README Onboarding Quality Scorecard
app.get('/api/repo/:owner/:repo/readme-score', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const { owner, repo } = req.params;
  const config = getGithubConfig(session.accessToken);
  
  try {
    const readmeRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/readme`, config);
    const readmeContent = Buffer.from(readmeRes.data.content, 'base64').toString('utf-8');

    const ai = getAiClient();
    if (!ai) return res.status(500).json({ error: 'Gemini API not configured' });

    const prompt = `Analyze this README for onboarding quality. Does it have a clear setup guide, contribution guidelines, code of conduct link, license, contact information, and a description of the project's purpose? Score each category 0-10 and return JSON ONLY in this format: { "setup_guide": 8, "contribution_guidelines": 5, "code_of_conduct": 0, "license": 10, "contact": 5, "purpose": 9, "suggestions": ["Add a code of conduct", "Improve setup guide"] }.\n\nREADME:\n${readmeContent.substring(0, 5000)}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    // Parse json from response
    let text = response.text || '';
    if (text.includes('\`\`\`json')) {
      text = text.split('\`\`\`json')[1].split('\`\`\`')[0];
    } else if (text.includes('\`\`\`')) {
      text = text.split('\`\`\`')[1].split('\`\`\`')[0];
    }
    const scorecard = JSON.parse(text.trim());
    
    res.json(scorecard);
  } catch (error) {
    console.error('README Score Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to score README' });
  }
});

// Bus Factor Heatmap
app.get('/api/repo/:owner/:repo/bus-factor', async (req, res) => {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  const { owner, repo } = req.params;
  const config = getGithubConfig(session.accessToken);
  
  try {
    const repoInfo = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, config);
    const defaultBranch = repoInfo.data.default_branch;
    
    const treeRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, config);
    
    // Filter to code files roughly and limit to 40 max to avoid hitting GitHub API limits too hard
    const blobs = treeRes.data.tree.filter(t => t.type === 'blob');
    const filesToAnalyze = blobs.slice(0, 40);
    
    let totalFilesAnalyzed = 0;
    let singleContributorFiles = 0;
    const heatmap = [];

    // process sequentially to avoid triggering abuse mechanisms
    for (let f of filesToAnalyze) {
      try {
        const commitsRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?path=${f.path}&per_page=10`, config);
        const uniqueAuthors = new Set();
        for (let c of commitsRes.data) {
           if (c.author && c.author.login) uniqueAuthors.add(c.author.login);
           else if (c.commit && c.commit.author) uniqueAuthors.add(c.commit.author.name);
        }
        
        const count = uniqueAuthors.size;
        totalFilesAnalyzed++;
        if (count === 1) singleContributorFiles++;
        
        heatmap.push({
           path: f.path,
           unique_contributors: count,
           risk: count === 1 ? 'high' : (count === 2 ? 'medium' : 'low')
        });
      } catch (err) {
        // ignore individual file errors
      }
    }

    const bus_factor_score = totalFilesAnalyzed === 0 ? 100 : Math.round(((totalFilesAnalyzed - singleContributorFiles) / totalFilesAnalyzed) * 100);
    
    res.json({ bus_factor_score, heatmap });
  } catch (error) {
    console.error('Bus Factor Error:', error.message);
    res.status(500).json({ error: 'Failed to calculate bus factor' });
  }
});

// GitStat Embeddable Badge
app.get('/badge/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  try {
     const authQuery = GITHUB_CLIENT_ID ? `client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}` : '';
     const url = `https://api.github.com/repos/${owner}/${repo}/stats/contributors?${authQuery}`;
     const statsRes = await axios.get(url);
     
     let score = 50;
     if (statsRes.status === 200 && Array.isArray(statsRes.data)) {
        const count = statsRes.data.length;
        score = Math.min(100, count * 5 + 40); 
     } else if (statsRes.status === 202) {
        score = 65;
     }
     
     let color = '#ef4444'; // red
     if (score >= 80) color = '#22c55e'; // green
     else if (score >= 60) color = '#eab308'; // yellow
     
     const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20">
  <linearGradient id="b" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="a"><rect width="120" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#a)">
    <path fill="#555" d="M0 0h60v20H0z"/>
    <path fill="${color}" d="M60 0h60v20H60z"/>
    <path fill="url(#b)" d="M0 0h120v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
    <text x="300" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="500">Health</text>
    <text x="300" y="140" transform="scale(.1)" textLength="500">Health</text>
    <text x="900" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="500">${score}</text>
    <text x="900" y="140" transform="scale(.1)" textLength="500">${score}</text>
  </g>
</svg>`;

     res.setHeader('Content-Type', 'image/svg+xml');
     res.setHeader('Cache-Control', 'public, max-age=3600');
     res.send(svg);
  } catch(error) {
     res.setHeader('Content-Type', 'image/svg+xml');
     res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20"><rect width="120" height="20" fill="#999"/><text x="10" y="14" fill="#fff" font-family="sans-serif" font-size="11">Health: N/A</text></svg>`);
  }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
