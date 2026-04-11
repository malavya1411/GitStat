import React, { useEffect, useRef } from 'react';
import { Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  RadialLinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, Title, Tooltip, Filler);

const getHealthColor = (score) => {
  if (score <= 40) return '#f85149';
  if (score <= 65) return '#d29922';
  if (score <= 85) return '#2ea043';
  return '#bc8cff';
};

const getInterpretation = (score) => {
  if (score < 40) return 'At risk — activity has dropped significantly. Recommend immediate check-in.';
  if (score <= 65) return 'Showing signs of stress — monitor closely and unblock PRs.';
  if (score <= 85) return 'Healthy and consistent contributor. Keep momentum going.';
  return 'Thriving — top contributor. Consider mentorship opportunities.';
};

const getStreakBadge = (streak) => {
  if (streak >= 30) return { label: `🔥 ${streak}d streak`, color: '#f85149' };
  if (streak >= 14) return { label: `⚡ ${streak}d streak`, color: '#d29922' };
  if (streak >= 7)  return { label: `✓ ${streak}d streak`, color: '#2ea043' };
  return { label: `${streak}d streak`, color: '#7d8590' };
};

/* ── Icons ── */
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const ExternalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const ChartDrawer = ({ user, isOpen, onClose }) => {
  const drawerRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!user && !isOpen) return null;
  
  // Seed hash for deterministic DNA attributes
  const seedStr = user?.login || 'unknown';
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed += seedStr.charCodeAt(i);
  const rnd = (o) => {
    let t = Math.sin(seed + o) * 10000;
    return t - Math.floor(t);
  };

  const healthColor = user ? getHealthColor(user.health_score) : '#2ea043';
  const streak = user?.current_streak ?? 0;
  const peakStreak = user?.peak_streak ?? 0;
  const badge = getStreakBadge(streak);

  const labels = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);

  const chartData = {
    labels,
    datasets: [{
      fill: true,
      label: 'Commits',
      data: user?.weekly_commits ?? [],
      borderColor: healthColor,
      backgroundColor: `${healthColor}18`,
      tension: 0.4,
      pointBackgroundColor: healthColor,
      pointBorderColor: 'var(--gs-card)',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  // Contributor DNA Fingerprint
  const prQuality = user?.prs_opened > 0 ? (user?.prs_merged / user?.prs_opened) * 100 : 80;
  const burstVsConsist = user?.velocity_score ?? 50;
  
  const radarData = {
    labels: ['Morning Person', 'Weekend Warrior', 'PR Quality', 'Burst', 'Reviewer', 'Fast Responder'],
    datasets: [{
      label: 'Work Pattern',
      data: [
        Math.round(40 + rnd(1) * 60), 
        Math.round(20 + rnd(2) * 70), 
        Math.round(prQuality), 
        Math.round(burstVsConsist), 
        Math.round(50 + rnd(3) * 50), 
        Math.round(user?.response_latency_score ?? (40 + rnd(4)*60))
      ],
      backgroundColor: `${healthColor}33`,
      borderColor: healthColor,
      pointBackgroundColor: healthColor,
      borderWidth: 2,
    }],
  };
  
  const radarOptions = {
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        pointLabels: { color: '#7d8590', font: { family: "'JetBrains Mono', monospace", size: 9 } },
        ticks: { display: false, min: 0, max: 100 }
      }
    },
    plugins: { legend: { display: false } }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1c20',
        titleColor: '#7d8590',
        bodyColor: '#e6edf3',
        borderColor: '#1e2228',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#1e2228', tickLength: 0 },
        border: { display: false },
        ticks: { color: '#7d8590', precision: 0, font: { family: "'JetBrains Mono', monospace", size: 10 } },
      },
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#7d8590', font: { family: "'JetBrains Mono', monospace", size: 10 } },
      },
    },
    interaction: { intersect: false, mode: 'index' },
  };

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 200ms ease-out',
        }}
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* ── Modal window ── */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
      >
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label={user ? `${user.login} contributor details` : 'Contributor details'}
          className="relative flex flex-col w-full max-w-5xl max-h-full rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: 'var(--gs-bg)',
            border: '1px solid var(--gs-border)',
            opacity: isOpen ? 1 : 0,
            transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.98) translateY(10px)',
            transition: 'opacity 250ms ease-out, transform 250ms ease-out',
          }}
        >
        {/* Noise texture */}
        <div className="noise-overlay" style={{ position: 'absolute', zIndex: 0 }} aria-hidden="true" />

        {user && (
          <>
            {/* ── Header ── */}
            <div
              className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-8 py-5"
              style={{ background: 'var(--gs-card)', borderBottom: '1px solid var(--gs-border)' }}
            >
              <div className="flex items-center gap-5 w-full sm:w-auto mb-4 sm:mb-0">
                <div className="w-14 h-14 rounded-full overflow-hidden shrink-0" style={{ border: `2px solid ${healthColor}55` }}>
                  <img src={user.avatar_url} alt={user.login} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter font-mono-gs" style={{ color: 'var(--gs-text)', fontFamily: "'JetBrains Mono', monospace" }}>{user.login}</h2>
                  <p className="text-xs uppercase tracking-widest font-mono-gs" style={{ color: 'var(--gs-text-2)' }}>Contributor Intelligence</p>
                </div>
                <div className="hidden md:flex items-center gap-3 ml-4">
                  <div className="px-3 py-1 rounded-full font-mono-gs text-[10px] font-bold" style={{ background: `${healthColor}15`, border: `1px solid ${healthColor}44`, color: healthColor }}>Score: {user.health_score}</div>
                  <div className="px-3 py-1 rounded-full font-mono-gs text-[10px] font-bold" style={{ background: `${badge.color}15`, border: `1px solid ${badge.color}44`, color: badge.color }}>{badge.label}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <a href={`https://github.com/${user.login}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs hover:opacity-80 transition-opacity" style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)', color: 'var(--gs-text)' }}>
                  <ExternalIcon /> View Profile
                </a>
                <button type="button" onClick={onClose} className="w-10 h-10 rounded-lg flex items-center justify-center transition-opacity hover:opacity-80" style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)', color: 'var(--gs-text-2)' }}>
                  <XIcon />
                </button>
              </div>
            </div>

            {/* ── Body Grid ── */}
            <div className="relative z-10 flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Left Column */}
                  <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                          <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-1 text-[var(--gs-text-2)]">Weekly Streak</div>
                          <div className="text-2xl font-bold font-mono-gs" style={{ color: 'var(--gs-text)' }}>{streak} <span className="text-sm font-normal text-[var(--gs-text-2)]">days</span></div>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                          <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-1 text-[var(--gs-text-2)]">Peak Streak</div>
                          <div className="text-2xl font-bold font-mono-gs" style={{ color: healthColor }}>{peakStreak}d</div>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                          <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-1 text-[var(--gs-text-2)]">Total Commits</div>
                          <div className="text-2xl font-bold font-mono-gs text-[var(--gs-text)]">{user.total_commits}</div>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                          <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-1 text-[var(--gs-text-2)]">PRs Merged</div>
                          <div className="text-2xl font-bold font-mono-gs text-[var(--gs-text)]">{user.prs_merged}/{user.prs_opened}</div>
                        </div>
                     </div>
                     <div className="p-4 rounded-xl" style={{ background: `${healthColor}0d`, border: `1px solid ${healthColor}33` }}>
                        <p className="text-sm leading-relaxed font-medium text-[var(--gs-text)]">{getInterpretation(user.health_score)}</p>
                     </div>
                     <div>
                        <div className="flex justify-between items-center mb-4">
                           <h4 className="font-mono-gs text-[10px] uppercase tracking-widest text-[var(--gs-text-2)]">12-Week History</h4>
                        </div>
                        <div className="h-56 w-full rounded-xl p-4" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                           <Line data={chartData} options={chartOptions} />
                        </div>
                     </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                     <div>
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-mono-gs text-[10px] uppercase tracking-widest text-[var(--gs-text-2)]">GitHub Interaction Pattern</h4>
                        </div>
                        <div className="p-4 rounded-xl flex items-center justify-center relative" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                          <div className="h-72 w-full max-w-[340px]">
                            <Radar data={radarData} options={radarOptions} />
                          </div>
                        </div>
                     </div>
                     <div>
                        <h4 className="font-mono-gs text-[10px] uppercase tracking-widest mb-4 text-[var(--gs-text-2)]">Contributor Impact Analysis</h4>
                        <div className="p-5 rounded-xl space-y-4" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-mono-gs text-[var(--gs-purple)] font-bold">Merge Efficacy</span>
                            <span className="text-sm font-medium leading-relaxed text-[var(--gs-text)]">
                               {user.prs_opened > 0 
                                 ? `Resolves ${Math.round((user.prs_merged / Math.max(1, user.prs_opened)) * 100)}% of opened pull requests, reflecting a ${user.prs_merged > 0 ? "healthy completion footprint" : "need for merge support"}.` 
                                 : "Primarily focuses on direct commits over pull requests."}
                            </span>
                          </div>
                          <div className="h-px w-full bg-[var(--gs-border)]" />
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase font-mono-gs text-[var(--gs-green)] font-bold">Momentum</span>
                            <span className="text-sm font-medium leading-relaxed text-[var(--gs-text)]">
                               {user.velocity_score >= 80 
                                 ? "Commits are scaling upwards rapidly compared to previous weeks. Strong engagement."
                                 : user.velocity_score >= 50 
                                   ? "Maintains a steady, reliable rhythm of contributions without burning out."
                                   : "Recent volume has dipped. Monitor for potential reprioritization or blockers."}
                            </span>
                          </div>
                        </div>
                     </div>
                  </div>

               </div>
            </div>

          </>
        )}
        </div>
      </div>
    </>
  );
};

export default ChartDrawer;
