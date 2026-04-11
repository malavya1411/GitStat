import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getCachedAnalysis } from '../utils/apiCache';
import axios from 'axios';
import RepoLayout from '../components/RepoLayout';
import ContributorCard from '../components/ContributorCard';
import ChartDrawer from '../components/ChartDrawer';
import { computeTimeMachineStats, predictBurnout } from '../utils/metrics';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

/* ── Helper: clamp ── */
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* ── Role inference ── */
const getContributorRole = (c, index) => {
  if (index === 0) return 'Lead Architect';
  if (c.pr_score >= 80) return 'Senior Frontend';
  if (c.streak_score >= 60) return 'DevOps Engineer';
  if (c.response_latency_score >= 80) return 'Maintainer Ally';
  if (c.velocity_score >= 75) return 'Core Maintainer';
  return 'Project Contributor';
};

const formatShortValue = (v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`;

const buildAiSummary = (contributors, repo, friendlinessScore, ghostContributors) => {
  if (contributors.length === 0)
    return `GitStat could not compute a contributor snapshot for ${repo} yet. Try a repository with recent activity.`;
  const strongest = [...contributors].sort((a, b) => b.health_score - a.health_score)[0];
  const atRisk = contributors.filter(c => c.health_score < 55);
  const names = atRisk.slice(0, 2).map(c => c.login).join(', ');
  const ghostNames = ghostContributors.slice(0, 2).map(c => c.login).join(', ');
  let s = `${strongest.login} is currently setting the pace for ${repo} with a health score of ${strongest.health_score}. `;
  if (atRisk.length) s += `${names} ${atRisk.length === 1 ? 'needs' : 'need'} a check-in — momentum is dropping. `;
  else s += 'No contributor is in the critical zone this week. ';
  if (ghostContributors.length) s += `Ghost contributor risk is rising around ${ghostNames}. `;
  s += `First-time contributor friendliness is ${friendlinessScore}/100.`;
  return s;
};

/* ── Icons ── */
const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const LogOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const BackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);
const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);
const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 20l.5 1.5L7 22l-1.5.5L5 24l-.5-1.5L3 22l1.5-.5L5 20z"/>
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

/* ── Skeleton card ── */
const SkeletonCard = () => (
  <div className="rounded-xl p-6 space-y-4" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full skeleton" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-28 rounded" />
          <div className="skeleton h-3 w-20 rounded" />
        </div>
      </div>
      <div className="skeleton w-14 h-14 rounded-full" />
    </div>
    {[80, 65, 90, 55].map((w, i) => (
      <div key={i} className="space-y-1">
        <div className="flex justify-between">
          <div className="skeleton h-2.5 rounded" style={{ width: `${w * 0.5}px` }} />
          <div className="skeleton h-2.5 w-8 rounded" />
        </div>
        <div className="skeleton h-[3px] rounded-full w-full" />
      </div>
    ))}
    <div className="skeleton h-6 w-full rounded mt-2" style={{ marginTop: '1rem' }} />
  </div>
);

const RepoAnalysis = () => {
  const { owner, repo } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0);


  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await getCachedAnalysis(owner, repo, `${API_BASE_URL}/api/repo/${owner}/${repo}/analyze`);
        setData(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to analyze repository. It might be too large or private.');
      } finally {
        setLoading(false);
      }
    };
    

    


    fetchData();
  }, [owner, repo]);

  const enrichedData = useMemo(() => {
    return data.map((c, i) => {
      // 1. Time machine transformation
      const timeShifted = computeTimeMachineStats(c, timeOffset);
      // 2. Burnout prediction (only run if offset is 0 for reality, or offset it too)
      const burnoutRisk = predictBurnout(c, timeOffset);
      return { 
        ...timeShifted,
        role: getContributorRole(timeShifted, i),
        burnoutRisk
      };
    });
  }, [data, timeOffset]);

  const filteredContributors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return enrichedData;
    return enrichedData.filter(c =>
      c.login.toLowerCase().includes(q) || c.role.toLowerCase().includes(q)
    );
  }, [enrichedData, searchTerm]);

  const aggregateSeries = useMemo(() => {
    const totals = Array.from({ length: 12 }, () => 0);
    filteredContributors.forEach(c => c.weekly_commits.forEach((v, i) => { totals[i] += v; }));
    return totals;
  }, [filteredContributors]);

  const ghostContributors = useMemo(
    () => enrichedData.filter(c => {
      const recent = c.weekly_commits.slice(-4).reduce((s, v) => s + v, 0);
      const previous = c.weekly_commits.slice(0, 8).reduce((s, v) => s + v, 0);
      return recent === 0 && previous > 0;
    }),
    [enrichedData]
  );

  const friendlinessScore = useMemo(() => {
    if (!enrichedData.length) return 0;
    const newC = enrichedData.filter(c => c.total_commits <= 5);
    const mergeSupport = newC.length === 0 ? 70
      : Math.round(newC.reduce((s, c) => s + (c.prs_opened === 0 ? 60 : (c.prs_merged / c.prs_opened) * 100), 0) / newC.length);
    const streakBoost = Math.round(enrichedData.reduce((s, c) => s + c.streak_score, 0) / enrichedData.length);
    return clamp(Math.round(mergeSupport * 0.65 + streakBoost * 0.35), 0, 100);
  }, [enrichedData]);

  const summary = useMemo(() => {
    if (!filteredContributors.length) return { averageHealth: 0, averageVelocity: 0, totalCommits: 0, totalPRs: 0, peakWeekly: 0, trendDelta: 0 };
    const totalCommits = filteredContributors.reduce((s, c) => s + c.total_commits, 0);
    const totalPRs = filteredContributors.reduce((s, c) => s + c.prs_opened, 0);
    const averageHealth = Math.round(filteredContributors.reduce((s, c) => s + c.health_score, 0) / filteredContributors.length);
    const averageVelocity = Math.round(filteredContributors.reduce((s, c) => s + c.velocity_score, 0) / filteredContributors.length);
    const peakWeekly = Math.max(...aggregateSeries, 0);
    const firstHalf = aggregateSeries.slice(0, 6).reduce((s, v) => s + v, 0);
    const secondHalf = aggregateSeries.slice(6).reduce((s, v) => s + v, 0);
    const trendDelta = firstHalf === 0 ? 100 : Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
    return { averageHealth, averageVelocity, totalCommits, totalPRs, peakWeekly, trendDelta };
  }, [aggregateSeries, filteredContributors]);

  const aiSummary = useMemo(
    () => buildAiSummary(filteredContributors, repo, friendlinessScore, ghostContributors),
    [filteredContributors, repo, friendlinessScore, ghostContributors]
  );

  const handleCopyReport = async () => {
    const url = `${window.location.origin}/repo/${owner}/${repo}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  };

  const closeDrawer = () => setSelectedUser(null);

  /* ── Loading ── */
  if (loading) return (
    <RepoLayout>
      <div className="mb-10">
        <div className="skeleton h-6 w-48 rounded mb-3" />
        <div className="skeleton h-12 w-80 rounded mb-2" />
        <div className="skeleton h-4 w-64 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </RepoLayout>
  );

  /* ── Error ── */
  if (error) return (
    <RepoLayout>
      <div className="flex h-full items-center justify-center">
        <div className="max-w-xl rounded-xl px-8 py-6 text-center" style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.28)', color: 'var(--gs-red)' }}>
          <p className="font-bold mb-2">Analysis Failed</p>
          <p className="text-sm font-mono-gs mb-4">{error}</p>
          <button 
            onClick={() => { setLoading(true); setError(''); window.location.reload(); }}
            className="underline underline-offset-4 cursor-pointer font-mono-gs text-xs uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    </RepoLayout>
  );

  return (
    <RepoLayout
      searchSlot={
        <input
          type="text"
          id="contributor-search"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Filter contributors..."
          className="hidden md:block text-sm rounded-lg px-4 py-2 outline-none font-mono-gs w-52"
          style={{
            background: 'var(--gs-surface)',
            border: '1px solid var(--gs-border)',
            color: 'var(--gs-text)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
      }
    >


          {/* Breadcrumb + title */}
          <header className="mb-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono-gs text-sm" style={{ color: 'var(--gs-text-muted)' }}>System / Repository / Analysis</span>
            </div>
            <div className="flex items-baseline gap-4 flex-wrap">
              <h1
                className="text-4xl md:text-5xl font-black tracking-tighter"
                style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}
              >
                {repo}
              </h1>
              <span className="font-mono-gs text-xl" style={{ color: 'var(--gs-text-muted)' }}>
                / {owner}
              </span>
            </div>

            {/* KPI row */}
            <div className="flex flex-wrap gap-6 mt-6">
              {[
                { label: 'Contributors', value: filteredContributors.length },
                { label: 'Avg Health', value: summary.averageHealth },
                { label: 'Total Commits', value: formatShortValue(summary.totalCommits) },
                { label: 'Total PRs', value: summary.totalPRs },
                { label: 'Trend', value: `${summary.trendDelta >= 0 ? '+' : ''}${summary.trendDelta}%` },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--gs-text-muted)' }}>
                    {label}
                  </div>
                  <div
                    className="font-mono-gs text-xl font-bold"
                    style={{ color: 'var(--gs-text)', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Repo Health Time Machine Slider */}
            {!loading && !error && data.length > 0 && (
               <div className="mt-8 rounded-xl p-5" style={{ background: 'var(--gs-surface-high)', border: '1px solid var(--gs-border)' }}>
                 <div className="flex justify-between mb-4">
                   <div>
                     <h3 className="font-bold text-sm" style={{ color: 'var(--gs-text)' }}>Repo Health Time Machine</h3>
                     <p className="text-[10px] uppercase font-mono-gs tracking-widest mt-1" style={{ color: 'var(--gs-text-2)' }}>Replay contributor metrics backwards in time</p>
                   </div>
                   <div className="text-right">
                     <span className="font-mono-gs font-bold text-sm" style={{ color: timeOffset === 0 ? 'var(--gs-green)' : 'var(--gs-amber)' }}>
                       {timeOffset === 0 ? 'Current Week' : `${timeOffset} Weeks Ago`}
                     </span>
                   </div>
                 </div>
                 <div className="relative pt-2 pb-4">
                   <input 
                     type="range" 
                     min="0" max="10" step="1" 
                     value={timeOffset} 
                     onChange={(e) => setTimeOffset(Number(e.target.value))}
                     className="w-full h-1.5 rounded-full outline-none cursor-pointer"
                     style={{
                       background: `linear-gradient(to left, var(--gs-green) 0%, var(--gs-surface-high) 100%)`, 
                       direction: 'rtl'
                     }}
                   />
                   <div className="flex justify-between mt-2 font-mono-gs text-[8px] uppercase tracking-widest text-[#7d8590]">
                     <span>10 Weeks Ago</span>
                     <span>Current</span>
                   </div>
                 </div>
               </div>
            )}
          </header>

          {/* ── Contributor card grid ── */}
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
            {filteredContributors.map((c, i) => (
              <ContributorCard
                key={c.login}
                data={c}
                onClick={() => setSelectedUser(c)}
                role={c.role}
                animationDelay={i * 40}
              />
            ))}
            {filteredContributors.length === 0 && !loading && (
              <div className="col-span-full text-center py-16 font-mono-gs" style={{ color: 'var(--gs-text-2)' }}>
                No contributors match "{searchTerm}".
              </div>
            )}
          </section>

          {/* ── Analytics row ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">

            {/* Velocity chart */}
            <div
              className="xl:col-span-2 rounded-xl p-6"
              style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--gs-text-muted)' }}>
                    Velocity Matrix
                  </div>
                  <div className="font-bold text-xl" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>
                    Throughput Over Time
                  </div>
                </div>
              </div>
              <div className="h-48 flex items-end gap-1">
                {aggregateSeries.map((v, i) => {
                  const peak = Math.max(...aggregateSeries, 1);
                  const isPeak = v === peak && v > 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                      {v > 0 && (
                        <div
                          className="font-mono-gs text-[9px] font-bold"
                          style={{ color: isPeak ? 'var(--gs-green)' : 'var(--gs-text-muted)' }}
                        >
                          {formatShortValue(v)}
                        </div>
                      )}
                      <div
                        className="w-full rounded-t-sm transition-all"
                        style={{
                          height: `${Math.max(6, (v / Math.max(peak, 1)) * 160)}px`,
                          background: isPeak ? 'var(--gs-green)' : 'var(--gs-surface-high)',
                          opacity: isPeak ? 0.9 : 0.5,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-rows-2 gap-6">
              <div className="rounded-xl p-6 flex flex-col justify-between" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                <div className="font-mono-gs text-[10px] uppercase tracking-widest" style={{ color: 'var(--gs-text-muted)' }}>
                  Avg Health Score
                </div>
                <div>
                  <span className="text-4xl font-bold font-mono-gs" style={{ color: 'var(--gs-text)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {summary.averageHealth}
                  </span>
                  <span className="ml-2 text-sm font-mono-gs" style={{ color: summary.trendDelta >= 0 ? 'var(--gs-green)' : 'var(--gs-red)' }}>
                    {summary.trendDelta >= 0 ? '↑' : '↓'} {Math.abs(summary.trendDelta)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--gs-surface-high)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${summary.averageHealth}%`, background: 'var(--gs-green)' }}
                  />
                </div>
              </div>
              <div className="rounded-xl p-6 flex flex-col justify-between relative overflow-hidden" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                <div className="font-mono-gs text-[10px] uppercase tracking-widest" style={{ color: 'var(--gs-text-muted)' }}>
                  Friendliness Score
                </div>
                <div className="text-4xl font-bold font-mono-gs" style={{ color: 'var(--gs-text)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {friendlinessScore}
                </div>
                <div className="flex gap-1 mt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: i < Math.round(friendlinessScore / 25) ? 'var(--gs-green)' : 'var(--gs-surface-high)' }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── AI Summary + Ghost contributors ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* AI Summary */}
            <div className="relative rounded-xl p-8 overflow-hidden group transition-all duration-500 hover:border-[var(--gs-border-subtle)]" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
              <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] blur-2xl transition-opacity duration-500" style={{ background: 'radial-gradient(circle at top left, var(--gs-purple), transparent 70%)' }}></div>
              <div className="relative z-10 flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm" style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)' }}>
                   <div style={{color: 'var(--gs-purple)'}}><SparklesIcon /></div>
                </div>
                <span className="font-mono-gs text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--gs-text)' }}>
                  AI Summary
                </span>
              </div>
              <p className="relative z-10 text-[14px] leading-relaxed" style={{ color: 'var(--gs-text-2)' }}>{aiSummary}</p>
            </div>

            {/* Ghost contributors */}
            <div className="relative rounded-xl p-8 overflow-hidden group transition-all duration-500 hover:border-[var(--gs-border-subtle)]" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
              <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.08] blur-2xl transition-opacity duration-500" style={{ background: `radial-gradient(circle at top right, ${ghostContributors.length > 0 ? 'var(--gs-amber)' : 'var(--gs-text-muted)'}, transparent 70%)` }}></div>
              <div className="relative z-10 flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm" style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)' }}>
                   <div style={{color: ghostContributors.length > 0 ? 'var(--gs-amber)' : 'var(--gs-text-2)'}}><UsersIcon /></div>
                </div>
                <span className="font-mono-gs text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--gs-text)' }}>
                  Ghost Contributor Detector
                </span>
              </div>
              <div className="relative z-10">
              {ghostContributors.length > 0 ? (
                <div className="space-y-3 mt-2 custom-scrollbar overflow-y-auto max-h-[140px] pr-2">
                  {ghostContributors.map(c => (
                    <button
                      key={c.login}
                      type="button"
                      onClick={() => setSelectedUser(c)}
                      className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-left transition-all hover:bg-[var(--gs-surface-high)] active:scale-[0.98] border border-transparent shadow-sm hover:border-[var(--gs-border-subtle)]"
                      style={{ background: 'var(--gs-surface)' }}
                    >
                      <span className="font-mono-gs font-bold text-sm truncate mr-2" style={{ color: 'var(--gs-text)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {c.login}
                      </span>
                      <span className="py-1 px-2.5 rounded-full font-mono-gs text-[9px] font-bold uppercase tracking-widest shrink-0" style={{ background: 'rgba(210,153,34,0.1)', color: 'var(--gs-amber)', border: '1px solid rgba(210,153,34,0.2)' }}>
                        silent 4w+
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] leading-relaxed mt-1" style={{ color: 'var(--gs-text-2)' }}>
                  No ghost contributors detected in the current 12-week window. The active team is reliably engaging with the repository.
                </p>
              )}
              </div>
            </div>
          </div>

          {/* ── Report card ── */}
          <div
            id="report-card"
            className="relative rounded-2xl p-8 md:p-12 mb-12 overflow-hidden shadow-2xl group border hover:border-[var(--gs-green)] transition-colors duration-500"
            style={{
              background: 'var(--gs-card)',
              borderColor: 'var(--gs-border)',
            }}
          >
             {/* Epic decorative green glow embedded inside the very card */}
             <div className="absolute top-[-20%] right-[-10%] w-[450px] h-[450px] opacity-[0.08] group-hover:opacity-[0.14] mix-blend-screen pointer-events-none rounded-full blur-[80px] transition-all duration-700" style={{ background: 'var(--gs-green)' }} />
             <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-[var(--gs-bg)] via-[var(--gs-green)] to-[var(--gs-bg)] opacity-30 group-hover:opacity-70 transition-opacity duration-700" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
               <div className="max-w-3xl">
                 <div className="flex items-center gap-3 mb-5">
                    <span className="flex h-2 w-2 rounded-full bg-[var(--gs-green)] ring-4 ring-[var(--gs-green)]/20 shadow-[0_0_8px_var(--gs-green)]"></span>
                    <span className="font-mono-gs text-[10px] font-bold uppercase tracking-[0.3em]" style={{color: 'var(--gs-green)'}}>Team Milestone</span>
                 </div>
                 <h3 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-[var(--gs-text)] to-[var(--gs-text-muted)]" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
                   {repo} — Report Card
                 </h3>
                 <p className="text-[15px] md:text-[16px] leading-relaxed max-w-xl pr-4" style={{color: 'var(--gs-text-2)'}}>
                   Velocity is {summary.trendDelta >= 0 ? <span className="font-bold text-[var(--gs-green)]">up {Math.abs(summary.trendDelta)}%</span> : <span className="font-bold text-[var(--gs-red)]">down {Math.abs(summary.trendDelta)}%</span>} this cycle. 
                   Peak weekly output reached <strong className="text-[var(--gs-text)] px-1">{formatShortValue(summary.peakWeekly)}</strong> commits. 
                   Team health average is currently <strong className="text-[var(--gs-text)] pl-1">{summary.averageHealth}</strong>.
                 </p>
               </div>
               
               <button
                 type="button"
                 id="copy-report-btn"
                 onClick={handleCopyReport}
                 className="relative z-10 flex items-center justify-center shrink-0 gap-3 px-6 h-12 rounded-xl font-bold text-[13px] transition-all hover:bg-[var(--gs-surface)] transform active:scale-95 shadow-lg border hover:border-[var(--gs-green)]"
                 style={{ background: 'var(--gs-surface-high)', color: 'var(--gs-text)', borderColor: 'var(--gs-border)' }}
               >
                 <CopyIcon />
                 {copied ? <span style={{color: 'var(--gs-green)'}}>✓ Link copied!</span> : 'Copy Report Link'}
               </button>
            </div>
          </div>



          {/* Embeddable Badge */}
          <div className="rounded-xl p-8 mb-12 relative overflow-hidden group border hover:border-[var(--gs-border-subtle)] transition-colors" style={{ background: 'var(--gs-card)', borderColor: 'var(--gs-border)' }}>
             <div className="absolute inset-0 opacity-[0.02] group-hover:opacity-[0.05] bg-[url('/icons.svg#grid')] blur-[1px]"></div>
             <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
               <div className="flex-1 w-full text-center md:text-left">
                 <h3 className="text-2xl font-black mb-3" style={{ fontFamily: "'Geist Sans', sans-serif" }}>Emit your health everywhere.</h3>
                 <p className="text-[14px] text-[var(--gs-text-2)] mb-6 max-w-md mx-auto md:mx-0">
                   Embed this dynamic SVG in your README. It reflects your live average contributor health score, instantly showing potential contributors a baseline metric of stability.
                 </p>
                 <div className="bg-[var(--gs-surface)] p-4 rounded-lg flex items-center justify-center border border-[var(--gs-border)] w-max mx-auto md:mx-0 shadow-inner">
                    <img src={`${API_BASE_URL}/badge/${owner}/${repo}`} alt="GitStat Health Badge" className="h-[24px]" />
                 </div>
               </div>
               <div className="flex-1 w-full flex flex-col justify-center">
                 <div className="bg-[#050505] p-5 rounded-xl border border-white/5 relative shadow-xl">
                   <div className="absolute -top-3 left-4 bg-[#050505] px-2 text-[10px] uppercase font-bold font-mono tracking-widest text-green-500">Markdown Format</div>
                   <div className="flex gap-4">
                     <code className="text-left w-full text-[12px] leading-relaxed text-[#eee] font-mono-gs break-all selection:bg-green-500/30">
                       [![GitStat Health]({API_BASE_URL}/badge/{owner}/{repo})]({window.location.origin}/repo/{owner}/{repo})
                     </code>
                   </div>
                 </div>
               </div>
             </div>
          </div>

      {/* ── Contributor drawer ── */}
      <ChartDrawer
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={closeDrawer}
      />
    </RepoLayout>
  );
};

export default RepoAnalysis;
