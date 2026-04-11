/**
 * useRepoArchitecture.js
 * Custom hook: fetches and parses repo file tree, README meta, env example, contributing, good-first-issues
 */
import { useState, useEffect } from 'react';
import axios from 'axios';
import { detectTechStack } from '../utils/detectTechStack';
import { buildTreeStructure, getComplexity } from '../utils/buildTreeStructure';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export function useRepoArchitecture(owner, repo) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    fileTree: [],
    treeRoot: null,
    techStack: null,
    complexity: 'small',
    totalFiles: 0,
    envExample: null,
    hasContributing: false,
    contributingUrl: null,
    goodFirstIssueCount: 0,
    goodFirstIssueUrl: '',
    defaultBranch: 'main',
  });

  useEffect(() => {
    if (!owner || !repo) return;

    let cancelled = false;

    const run = async () => {
      setState(s => ({ ...s, loading: true, error: null }));

      try {
        // 1. Fetch repo info for default branch
        const repoRes = await axios.get(
          `${API_BASE_URL}/api/repo-info/${owner}/${repo}`,
          { withCredentials: true }
        );
        const defaultBranch = repoRes.data.default_branch || 'main';

        // 2. Fetch file tree
        const treeRes = await axios.get(
          `${API_BASE_URL}/api/repo-tree/${owner}/${repo}?branch=${defaultBranch}`,
          { withCredentials: true }
        );

        const flatTree = treeRes.data.tree || [];
        const blobs = flatTree.filter(f => f.type === 'blob');
        const totalFiles = blobs.length;
        const complexity = getComplexity(totalFiles);
        const treeRoot = buildTreeStructure(flatTree);

        // 3. Fetch package.json if exists (for framework detection)
        let packageJsonContent = null;
        const pkgFile = flatTree.find(f => f.path === 'package.json');
        if (pkgFile) {
          try {
            const pkgRes = await axios.get(
              `${API_BASE_URL}/api/repo-file/${owner}/${repo}?path=package.json`,
              { withCredentials: true }
            );
            packageJsonContent = pkgRes.data.content;
          } catch (e) { /* ignore */ }
        }

        // 4. Detect tech stack
        const techStack = detectTechStack(flatTree, packageJsonContent);

        // 5. Fetch .env.example if exists
        let envExample = null;
        if (techStack.hasEnvExample) {
          try {
            const envPath = flatTree.find(f =>
              f.path.toLowerCase().includes('.env.example')
            )?.path || '.env.example';
            const envRes = await axios.get(
              `${API_BASE_URL}/api/repo-file/${owner}/${repo}?path=${encodeURIComponent(envPath)}`,
              { withCredentials: true }
            );
            if (envRes.data.content) {
              envExample = parseEnvExample(envRes.data.content);
            }
          } catch (e) { /* ignore */ }
        }

        // 6. Good first issues count
        let goodFirstIssueCount = 0;
        try {
          const issuesRes = await axios.get(
            `${API_BASE_URL}/api/good-first-issues/${owner}/${repo}`,
            { withCredentials: true }
          );
          goodFirstIssueCount = issuesRes.data.count || 0;
        } catch (e) { /* ignore */ }

        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          fileTree: flatTree,
          treeRoot,
          techStack,
          complexity,
          totalFiles,
          envExample,
          hasContributing: techStack.hasContributing,
          contributingUrl: techStack.hasContributing
            ? `https://github.com/${owner}/${repo}/blob/${defaultBranch}/CONTRIBUTING.md`
            : null,
          goodFirstIssueCount,
          goodFirstIssueUrl: `https://github.com/${owner}/${repo}/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22`,
          defaultBranch,
        });
      } catch (err) {
        if (cancelled) return;
        setState(s => ({
          ...s,
          loading: false,
          error: err.response?.data?.error || err.message || 'Failed to fetch repo architecture',
        }));
      }
    };

    run();
    return () => { cancelled = true; };
  }, [owner, repo]);

  return state;
}

function parseEnvExample(content) {
  const lines = content.split('\n');
  const vars = [];
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    vars.push({ key, value, description: inferVarDescription(key) });
  });
  return vars;
}

function inferVarDescription(key) {
  const keyLower = key.toLowerCase();
  const knownMap = {
    openai_api_key: { desc: 'OpenAI API Key', link: 'https://platform.openai.com/api-keys', service: 'OpenAI' },
    github_token: { desc: 'GitHub Personal Access Token', link: 'https://github.com/settings/tokens', service: 'GitHub' },
    github_client_id: { desc: 'GitHub OAuth App Client ID', link: 'https://github.com/settings/developers', service: 'GitHub' },
    github_client_secret: { desc: 'GitHub OAuth App Client Secret', link: 'https://github.com/settings/developers', service: 'GitHub' },
    supabase_url: { desc: 'Supabase Project URL', link: 'https://app.supabase.com', service: 'Supabase' },
    supabase_anon_key: { desc: 'Supabase Anonymous Key', link: 'https://app.supabase.com', service: 'Supabase' },
    next_public_supabase_url: { desc: 'Supabase Project URL (public)', link: 'https://app.supabase.com', service: 'Supabase' },
    database_url: { desc: 'Database connection string', link: null, service: 'Database' },
    mongodb_uri: { desc: 'MongoDB connection URI', link: 'https://cloud.mongodb.com', service: 'MongoDB' },
    stripe_secret_key: { desc: 'Stripe Secret Key', link: 'https://dashboard.stripe.com/apikeys', service: 'Stripe' },
    stripe_publishable_key: { desc: 'Stripe Publishable Key', link: 'https://dashboard.stripe.com/apikeys', service: 'Stripe' },
    sendgrid_api_key: { desc: 'SendGrid API Key', link: 'https://app.sendgrid.com/settings/api_keys', service: 'SendGrid' },
    clerk_secret_key: { desc: 'Clerk Secret Key', link: 'https://dashboard.clerk.com', service: 'Clerk' },
    jwt_secret: { desc: 'JWT signing secret (any random string)', link: null, service: null },
    secret_key: { desc: 'Application secret key', link: null, service: null },
    redis_url: { desc: 'Redis connection URL', link: null, service: 'Redis' },
    aws_access_key_id: { desc: 'AWS Access Key ID', link: 'https://console.aws.amazon.com/iam', service: 'AWS' },
    aws_secret_access_key: { desc: 'AWS Secret Access Key', link: 'https://console.aws.amazon.com/iam', service: 'AWS' },
    gemini_api_key: { desc: 'Google Gemini API Key', link: 'https://aistudio.google.com/app/apikey', service: 'Google AI' },
  };
  return knownMap[keyLower] || { desc: null, link: null, service: null };
}
