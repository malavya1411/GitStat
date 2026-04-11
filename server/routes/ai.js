const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const { requireAuth } = require('../middleware/requireAuth');
const { validateRepoParams } = require('../utils/validate');
const { getGithubConfig } = require('../services/githubService');
const axios = require('axios');

const router = express.Router();

const getAiClient = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

// README Onboarding Quality Scorecard (AI-powered)
router.get('/:owner/:repo/readme-score', requireAuth, async (req, res) => {
  const { owner, repo } = req.params;
  const paramCheck = validateRepoParams(owner, repo);
  if (!paramCheck.valid) return res.status(400).json({ error: paramCheck.message });

  const config = getGithubConfig(req.accessToken);

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

    let text = response.text || '';
    if (text.includes('\`\`\`json')) {
      text = text.split('\`\`\`json')[1].split('\`\`\`')[0];
    } else if (text.includes('\`\`\`')) {
      text = text.split('\`\`\`')[1].split('\`\`\`')[0];
    }
    const scorecard = JSON.parse(text.trim());

    res.json(scorecard);
  } catch (error) {
    if (error.response?.status === 404) return res.status(404).json({ error: 'README not found' });
    console.error('README Score Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to score README' });
  }
});

module.exports = router;
