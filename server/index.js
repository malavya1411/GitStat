const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const axios = require('axios');
dotenv.config();

const { globalLimiter, analysisLimiter, authLimiter } = require('./middleware/rateLimiter');
const { validateRepoParams } = require('./utils/validate');
const { startSessionCleanup, sessions } = require('./utils/sessions');

const authRoutes = require('./routes/auth');
const aiRoutes = require('./routes/ai');
const repoRoutes = require('./routes/repo');

const app = express();
const PORT = process.env.PORT || 5001;

startSessionCleanup();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://git-stat-olive.vercel.app',
  'https://git-stat-60itaasdq-malavya1411s-projects.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

try {
  const helmet = require('helmet');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://avatars.githubusercontent.com"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
} catch {
  // Helmet highly recommended — run: npm install helmet
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    console.error(`CORS blocked: ${origin}`)
    callback(new Error('CORS policy violation — origin not allowed'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['set-cookie']
}))

app.options('*', cors())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Credentials', 'true')
  next()
})

app.use(express.json());
app.use(cookieParser());

// Apply limiters
try {
  app.use('/api/', globalLimiter);
  app.use('/api/repo/:owner/:repo/analyze', analysisLimiter);
  app.use('/auth/', authLimiter);
} catch {
  // express-rate-limit highly recommended — run: npm install express-rate-limit
}

// Routes
app.use('/auth', authRoutes);
app.use('/api', repoRoutes);
app.use('/api/repo', aiRoutes);

// Get current user (public, purely checks session cookie presence)
app.get('/api/me', (req, res) => {
  const sessionId = req.cookies?.session_id;
  const session = sessionId ? sessions[sessionId] : null;
  if (!session) return res.status(401).json({ error: 'Not logged in' });
  res.json({ username: session.username, avatarUrl: session.avatarUrl });
});

// Non-authenticated public badge embed route
app.get('/badge/:owner/:repo', async (req, res) => {
  const { owner, repo } = req.params;
  const paramCheck = validateRepoParams(owner, repo);
  if (!paramCheck.valid) return res.status(400).json({ error: paramCheck.message });

  try {
    const authQuery = process.env.GITHUB_CLIENT_ID ? `client_id=${process.env.GITHUB_CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}` : '';
    const url = `https://api.github.com/repos/${owner}/${repo}/stats/contributors?${authQuery}`;
    const statsRes = await axios.get(url);

    let score = 50;
    if (statsRes.status === 200 && Array.isArray(statsRes.data)) {
      const count = statsRes.data.length;
      score = Math.min(100, count * 5 + 40);
    } else if (statsRes.status === 202) {
      score = 65;
    }

    let color = '#ef4444';
    if (score >= 80) color = '#22c55e';
    else if (score >= 60) color = '#eab308';

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
  } catch {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20"><rect width="120" height="20" fill="#999"/><text x="10" y="14" fill="#fff" font-family="sans-serif" font-size="11">Health: N/A</text></svg>`);
  }
});

// Global error handler
app.use((err, req, res, _next) => {
  // No console logs for generic 4xx errors, only unexpected 5xx
  if (!err.status || err.status >= 500) {
    // Only logging necessary fatal errors with date
    process.stderr.write(`[${new Date().toISOString()}] Server Error: ${err.message}\n`);
  }
  
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    process.stdout.write(`[GitStat] Server running on http://localhost:${PORT}\n`);
  }
});
