const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { createSession, deleteSession } = require('../utils/sessions');

const router = express.Router();
const getEnv = () => ({
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI || `http://localhost:${process.env.PORT || 5001}/auth/callback`,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
});

// OAuth Callback
router.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code provided');

  const envVars = getEnv();

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: envVars.GITHUB_CLIENT_ID,
        client_secret: envVars.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: envVars.GITHUB_REDIRECT_URI,
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) throw new Error(`Failed to get access token: ${JSON.stringify(tokenResponse.data)}`);

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'GitStat-App',
      },
    });

    const { login: username, avatar_url: avatarUrl } = userResponse.data;

    const sessionId = crypto.randomBytes(32).toString('hex');
    createSession(sessionId, {
      accessToken,
      username,
      avatarUrl,
      ipAddress: req.ip,
    });

    res.redirect(`${envVars.FRONTEND_URL}/auth/success?token=${sessionId}`);
  } catch (error) {
    console.error('OAuth Error:', error.response?.data || error.message);
    res.status(500).send(`Authentication failed: ${error.message} -- ${error.response?.data ? JSON.stringify(error.response.data) : ''}`);
  }
});

// Logout
router.get('/logout', (req, res) => {
  const { FRONTEND_URL } = getEnv();
  const sessionId = req.cookies?.session_id;
  if (sessionId) {
    deleteSession(sessionId);
    res.clearCookie('session_id');
  }
  res.redirect(FRONTEND_URL);
});

module.exports = router;
