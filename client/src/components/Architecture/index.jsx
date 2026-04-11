import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Layout, Activity, FlaskConical, Box, Files, Shield, XCircle } from 'lucide-react';
import { useRepoArchitecture } from '../../hooks/useRepoArchitecture';
import ArchitectureGraph from './ArchitectureGraph';
import TechStackBadges from './TechStackBadges';
import SetupGuide from './SetupGuide';

function SkeletonLine({ w = 'full', h = 4 }) {
  return (
    <div
      className={`rounded skeleton`}
      style={{ width: w === 'full' ? '100%' : w, height: `${h * 4}px` }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse-gs">
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
        <SkeletonLine w="40%" h={4} />
        <div className="flex gap-2">
          {[80, 100, 60, 90, 70].map((w, i) => (
            <div key={i} className="skeleton h-7 rounded-full" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
      <div className="rounded-2xl p-6 space-y-3" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
        <SkeletonLine w="30%" h={4} />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl p-6 space-y-3" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
            <SkeletonLine w="50%" h={4} />
            <div className="skeleton h-24 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}



function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(248,81,73,0.05)', border: '1px solid rgba(248,81,73,0.2)' }}>
      <div className="flex justify-center mb-4">
        <AlertCircle size={40} color="#f85149" strokeWidth={1.5} />
      </div>
      <p className="font-bold mb-2 text-[15px]" style={{ color: '#f85149' }}>Architecture Analysis Failed</p>
      <p className="text-[13px] mb-5 font-mono-gs" style={{ color: 'var(--gs-text-2)' }}>{error}</p>
      <button
        onClick={onRetry}
        className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
        style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149', border: '1px solid rgba(248,81,73,0.2)' }}
      >
        Retry
      </button>
    </div>
  );
}

export default function Architecture({ owner, repo }) {
  const [key, setKey] = useState(0); // increment to retry
  const { loading, error, treeRoot, techStack, complexity, totalFiles, envExample, hasContributing, contributingUrl, goodFirstIssueCount, goodFirstIssueUrl } = useRepoArchitecture(owner, repo);

  const sectionRef = useRef(null);
  const [sectionVisible, setSectionVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setSectionVisible(true); obs.disconnect(); } },
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [key]);

  if (loading) return (
    <section ref={sectionRef} className="mt-4 mb-12">
      <SectionHeading />
      <LoadingSkeleton />
    </section>
  );

  if (error) return (
    <section ref={sectionRef} className="mt-4 mb-12">
      <SectionHeading />
      <ErrorState error={error} onRetry={() => setKey(k => k + 1)} />
    </section>
  );
  return (
    <section ref={sectionRef} className="mt-4 mb-12">
      <SectionHeading isVisible={sectionVisible} />

      <div className="space-y-6">
        {/* Row 1: Tech stack + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TechStackBadges techStack={techStack} isVisible={sectionVisible} />
          </div>
          <RepoStatsCard
            complexity={complexity}
            totalFiles={totalFiles}
            hasCI={techStack?.hasCI}
            hasTests={techStack?.hasTests}
            hasDocker={techStack?.hasDocker}
            isVisible={sectionVisible}
          />
        </div>

        {/* Row 2: Architecture visualization */}
        <ArchitectureGraph
          treeRoot={treeRoot}
          complexity={complexity}
          totalFiles={totalFiles}
          techStack={techStack}
          isVisible={sectionVisible}
        />

        {/* Row 3: Setup Guide */}
        <div
          className="rounded-2xl p-8 transition-all duration-700"
          style={{
            background: 'var(--gs-card)',
            border: '1px solid var(--gs-border)',
            opacity: sectionVisible ? 1 : 0,
            transitionDelay: '300ms',
          }}
        >
          <SetupGuide
            owner={owner}
            repo={repo}
            techStack={techStack}
            envExample={envExample}
            hasContributing={hasContributing}
            contributingUrl={contributingUrl}
            goodFirstIssueCount={goodFirstIssueCount}
            goodFirstIssueUrl={goodFirstIssueUrl}
          />
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ isVisible = true }) {
  return (
    <div
      className="mb-8 transition-all duration-500"
      style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'none' : 'translateY(12px)' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="h-[2px] w-8 rounded-full" style={{ background: 'var(--gs-green)' }} />
        <span className="font-mono-gs text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: 'var(--gs-green)' }}>
          Deep Analysis
        </span>
      </div>
      <h2 className="text-3xl md:text-4xl font-black tracking-tighter" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>
        Repository Architecture
      </h2>
      <p className="mt-2 text-[14px] max-w-xl" style={{ color: 'var(--gs-text-2)' }}>
        Visualizing structure, detecting stack, and generating your personalized onboarding guide — automatically.
      </p>
    </div>
  );
}

function RepoStatsCard({ complexity, totalFiles, hasCI, hasTests, hasDocker, isVisible }) {
  const stats = [
    { label: 'Total Files', value: totalFiles.toLocaleString(), icon: <Files size={12} /> },
    { label: 'Complexity', value: complexity.charAt(0).toUpperCase() + complexity.slice(1), icon: <Layout size={12} /> },
    { label: 'CI/CD', value: hasCI ? 'Yes' : 'No', icon: hasCI ? <Activity size={12} /> : <XCircle size={12} /> },
    { label: 'Tests', icon: <FlaskConical size={12} />, value: hasTests ? 'Found' : 'None' },
    { label: 'Docker', value: hasDocker ? 'Yes' : 'No', icon: <Box size={12} /> },
  ];

  return (
    <div
      className="rounded-2xl p-6 transition-all duration-500"
      style={{
        background: 'var(--gs-card)',
        border: '1px solid var(--gs-border)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
        transitionDelay: '80ms',
      }}
    >
      <div className="text-[11px] uppercase tracking-[0.2em] font-bold font-mono-gs mb-4" style={{ color: '#484f58' }}>
        Repo Stats
      </div>
      <div className="space-y-3">
        {stats.map(s => (
          <div key={s.label} className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[12px] font-mono-gs" style={{ color: 'var(--gs-text-2)' }}>
              {s.icon} <span>{s.label}</span>
            </span>
            <span className="text-[12px] font-bold font-mono-gs" style={{ color: 'var(--gs-text)' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
