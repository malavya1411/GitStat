/**
 * SetupGuide.jsx
 * Dynamic step-by-step contributor setup guide with staggered animation
 */
import React, { useEffect, useRef, useState } from 'react';
import SetupStep from './SetupStep';

function buildSteps({ owner, repo, techStack, envExample, hasContributing, contributingUrl, goodFirstIssueCount, goodFirstIssueUrl }) {
  const steps = [];

  // Step 1: Fork & Clone
  steps.push({
    title: 'Fork & Clone',
    description: 'Start by forking the repository to your account, then clone it locally.',
    code: `# Fork via GitHub UI, then clone your fork:
git clone https://github.com/YOUR_USERNAME/${repo}.git
cd ${repo}

# Add upstream remote to stay synced
git remote add upstream https://github.com/${owner}/${repo}.git`,
    language: 'bash',
  });

  // Step 2: Install Dependencies
  steps.push({
    title: 'Install Dependencies',
    description: `This project uses ${techStack?.packageManager?.name || 'npm'}. Run the following command:`,
    code: techStack?.installCommand || 'npm install',
    language: 'bash',
  });

  // Step 3: Environment Setup (if .env.example exists)
  if (techStack?.hasEnvExample || (envExample && envExample.length > 0)) {
    const envCopyCmd = `cp .env.example .env`;
    steps.push({
      title: 'Environment Setup',
      description: 'Copy the example environment file and fill in your API keys and secrets.',
      code: envCopyCmd,
      language: 'bash',
      envVars: envExample || [],
    });
  } else {
    steps.push({
      title: 'Environment Setup',
      description: 'No .env.example found. Check the README for any required environment variables before running the project.',
      links: [{
        label: 'View README',
        url: `https://github.com/${owner}/${repo}#readme`,
      }],
    });
  }

  // Step 4: Run locally
  steps.push({
    title: 'Run Locally',
    description: 'Start the development server and verify everything is working.',
    code: techStack?.devCommand || 'npm run dev',
    language: 'bash',
    links: [
      { label: 'View on GitHub', url: `https://github.com/${owner}/${repo}` },
    ],
  });

  // Step 5: First Contribution Checklist
  const checklistItems = [];
  if (hasContributing && contributingUrl) {
    checklistItems.push({ text: 'Read CONTRIBUTING.md', link: contributingUrl });
  } else {
    checklistItems.push({ text: 'Check if a CONTRIBUTING.md file exists', link: `https://github.com/${owner}/${repo}` });
  }
  checklistItems.push({
    text: `Browse open "good first issue" labels${goodFirstIssueCount > 0 ? ` (${goodFirstIssueCount} open)` : ''}`,
    link: goodFirstIssueUrl,
  });
  checklistItems.push({ text: 'Create a feature branch', link: null });
  checklistItems.push({ text: 'Write tests for your changes', link: null });
  checklistItems.push({ text: 'Open a Pull Request with a clear description', link: `https://github.com/${owner}/${repo}/compare` });

  steps.push({
    title: 'Make Your First Contribution',
    description: 'Follow this checklist to make a smooth, well-received first PR.',
    code: `# Create a new branch for your feature or fix
git checkout -b feat/your-feature-name

# Make your changes, then commit
git add .
git commit -m "feat: describe your change"

# Push to your fork
git push origin feat/your-feature-name
# Then open a PR on GitHub ↗`,
    language: 'bash',
    checklist: checklistItems,
    links: [
      { label: 'Open PR', url: `https://github.com/${owner}/${repo}/compare` },
      ...(hasContributing ? [{ label: 'CONTRIBUTING.md', url: contributingUrl }] : []),
    ],
  });

  return steps;
}

export default function SetupGuide({
  owner, repo, techStack, envExample,
  hasContributing, contributingUrl,
  goodFirstIssueCount, goodFirstIssueUrl,
}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [stepsVisible, setStepsVisible] = useState([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Stagger step reveals
  useEffect(() => {
    if (!isVisible) return;
    const steps = buildSteps({ owner, repo, techStack, envExample, hasContributing, contributingUrl, goodFirstIssueCount, goodFirstIssueUrl });
    const timers = steps.map((_, i) =>
      setTimeout(() => setStepsVisible(prev => {
        const next = [...prev];
        next[i] = true;
        return next;
      }), i * 120)
    );
    return () => timers.forEach(clearTimeout);
  }, [isVisible, owner, repo, techStack, envExample, hasContributing, contributingUrl, goodFirstIssueCount, goodFirstIssueUrl]);

  const steps = buildSteps({ owner, repo, techStack, envExample, hasContributing, contributingUrl, goodFirstIssueCount, goodFirstIssueUrl });

  return (
    <div ref={ref}>
      {/* Section header */}
      <div
        className="mb-8 transition-all duration-700"
        style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(16px)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(46,160,67,0.1)', border: '1px solid rgba(46,160,67,0.25)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ea043" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <h2 className="text-[20px] font-black tracking-tight" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>
              Quick Setup Guide
            </h2>
            <p className="text-[12px] mt-0.5 font-mono-gs" style={{ color: 'var(--gs-text-muted)' }}>
              From zero → first contribution in minutes · personalized for {owner}/{repo}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-[2px] rounded-full overflow-hidden mt-4" style={{ background: 'var(--gs-surface)' }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: isVisible ? '100%' : '0%',
              background: 'linear-gradient(to right, var(--gs-green), #58a6ff, #bc8cff)',
              transitionDelay: '200ms',
            }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, i) => (
          <SetupStep
            key={i}
            step={step}
            index={i}
            isVisible={!!stepsVisible[i]}
          />
        ))}
      </div>
    </div>
  );
}
