import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getCachedAnalysis } from '../utils/apiCache';
import RepoLayout from '../components/RepoLayout';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const getHealthColor = (score) => {
  if (score <= 40) return 'var(--gs-red)';
  if (score <= 65) return 'var(--gs-amber)';
  if (score <= 85) return 'var(--gs-green)';
  return 'var(--gs-purple)';
};

const getLowestSignal = (c) => {
  const scores = [
    { label: 'Low velocity', val: c.velocity_score },
    { label: 'Broken streak', val: c.streak_score },
    { label: 'Low PR rate', val: c.pr_score },
    { label: 'Off-hours commits', val: c.offhours_score },
  ];
  return scores.sort((a, b) => a.val - b.val)[0].label;
};

const Sparkline = ({ data, color }) => {
  const W = 80, H = 20;
  if (!data || data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * (H - 2) - 1}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const Skeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({length:6}).map((_,i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
    </div>
    <div className="skeleton h-64 rounded-xl" />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="skeleton h-48 rounded-xl" />
      <div className="skeleton h-48 rounded-xl" />
    </div>
  </div>
);

const OverviewPage = () => {
  const { owner, repo } = useParams();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeBand, setActiveBand] = useState(null); // 'At Risk' | 'Stressed' | 'Healthy' | 'Thriving'

  const load = () => {
    setLoading(true); setError('');
    getCachedAnalysis(owner, repo, `${API_BASE_URL}/api/repo/${owner}/${repo}/analyze`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load overview data.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [owner, repo]);

  const stats = useMemo(() => {
    if (!data.length) return null;
    const totalContributors = data.length;
    const avgHealth = Math.round(data.reduce((s, c) => s + c.health_score, 0) / data.length);
    const totalCommits = data.reduce((s, c) => s + c.total_commits, 0);
    const totalPRsOpened = data.reduce((s, c) => s + c.prs_opened, 0);
    const totalPRsMerged = data.reduce((s, c) => s + c.prs_merged, 0);
    const prMergeRate = totalPRsOpened > 0 ? Math.round((totalPRsMerged / totalPRsOpened) * 100) : 0;
    return { totalContributors, avgHealth, totalCommits, totalPRsOpened, totalPRsMerged, prMergeRate };
  }, [data]);

  const healthBands = useMemo(() => {
    const bands = { atRisk: 0, stressed: 0, healthy: 0, thriving: 0 };
    data.forEach(c => {
      if (c.health_score <= 40) bands.atRisk++;
      else if (c.health_score <= 65) bands.stressed++;
      else if (c.health_score <= 85) bands.healthy++;
      else bands.thriving++;
    });
    return bands;
  }, [data]);

  const topByVelocity = useMemo(() =>
    [...data].sort((a, b) => b.velocity_score - a.velocity_score).slice(0, 3), [data]);

  const needsAttention = useMemo(() =>
    data.filter(c => c.health_score < 50).slice(0, 5), [data]);

  // Activity heatmap: 12 weeks × 7 days (simulated from weekly_commits)
  const heatmapData = useMemo(() => {
    const grid = Array.from({ length: 7 }, () => Array(12).fill(0));
    data.forEach(c => {
      c.weekly_commits.forEach((commits, weekIdx) => {
        const dayDist = [0.2, 0.18, 0.17, 0.16, 0.15, 0.08, 0.06];
        dayDist.forEach((frac, day) => {
          grid[day][weekIdx] += Math.round(commits * frac);
        });
      });
    });
    return grid;
  }, [data]);

  const maxHeat = useMemo(() => Math.max(...heatmapData.flat(), 1), [heatmapData]);

  const weekLabels = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      // Set to the most recent Sunday
      d.setDate(d.getDate() - d.getDay());
      // Go back (11 - i) weeks
      d.setDate(d.getDate() - (11 - i) * 7);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  }, []);

  const barChartData = {
    labels: ['At Risk (0-40)', 'Stressed (41-65)', 'Healthy (66-85)', 'Thriving (86-100)'],
    datasets: [{
      label: 'Contributors',
      data: [healthBands.atRisk, healthBands.stressed, healthBands.healthy, healthBands.thriving],
      backgroundColor: ['rgba(248,81,73,0.7)', 'rgba(210,153,34,0.7)', 'rgba(46,160,67,0.7)', 'rgba(188,140,255,0.7)'],
      borderColor: ['#f85149', '#d29922', '#2ea043', '#bc8cff'],
      borderWidth: 1, borderRadius: 6,
    }],
  };

  const barChartOptions = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y',
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const labels = ['At Risk', 'Stressed', 'Healthy', 'Thriving'];
        setActiveBand(labels[index]);
      }
    },
    plugins: { 
      legend: { display: false }, 
      tooltip: {
        backgroundColor: '#1a1c20', titleColor: '#7d8590', bodyColor: '#e6edf3',
        borderColor: '#1e2228', borderWidth: 1, padding: 10, displayColors: false,
      }
    },
    scales: {
      x: { beginAtZero: true, grid: { color: '#1e2228' }, border: { display: false },
        ticks: { color: '#7d8590', font: { family: "'JetBrains Mono', monospace", size: 10 }, precision: 0 } },
      y: { grid: { display: false }, border: { display: false },
        ticks: { color: '#7d8590', font: { family: "'JetBrains Mono', monospace", size: 10 } } },
    },
  };

  const bandContributors = useMemo(() => {
    if (!activeBand) return [];
    return data.filter(c => {
      if (activeBand === 'At Risk') return c.health_score <= 40;
      if (activeBand === 'Stressed') return c.health_score > 40 && c.health_score <= 65;
      if (activeBand === 'Healthy') return c.health_score > 65 && c.health_score <= 85;
      if (activeBand === 'Thriving') return c.health_score > 85;
      return false;
    }).sort((a,b) => b.health_score - a.health_score);
  }, [data, activeBand]);

  const STAT_ITEMS = stats ? [
    { label: 'Contributors', value: stats.totalContributors },
    { label: 'Avg Health', value: stats.avgHealth },
    { label: 'Total Commits', value: stats.totalCommits.toLocaleString() },
    { label: 'PRs Opened', value: stats.totalPRsOpened },
    { label: 'PRs Merged', value: stats.totalPRsMerged },
    { label: 'Merge Rate', value: `${stats.prMergeRate}%` },
  ] : [];

  return (
    <RepoLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono-gs text-sm" style={{ color: 'var(--gs-text-muted)' }}>
          System / Repository / Overview
        </span>
      </div>
      <div className="flex items-baseline gap-4 flex-wrap mb-10">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter"
          style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>{repo}</h1>
        <span className="font-mono-gs text-xl" style={{ color: 'var(--gs-text-muted)' }}>/ {owner}</span>
      </div>

      {loading && <Skeleton />}

      {error && (
        <div className="rounded-xl px-6 py-5 text-sm font-mono-gs flex items-center gap-4" style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.25)', color: 'var(--gs-red)' }}>
          {error}
          <button onClick={load} className="underline underline-offset-4 cursor-pointer hover:opacity-80">Retry</button>
        </div>
      )}

      {!loading && !error && stats && (
        <div className="space-y-8">
          {/* Summary stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {STAT_ITEMS.map(({ label, value }) => (
              <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--gs-text-muted)' }}>{label}</div>
                <div className="font-mono-gs text-2xl font-bold" style={{ color: 'var(--gs-text)', fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Health distribution chart */}
          <div className="rounded-xl p-6" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
            <div className="flex justify-between items-start mb-1">
              <div>
                <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--gs-text-muted)' }}>Health Distribution</div>
                <div className="font-bold text-xl mb-5" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>Contributor Health Bands</div>
              </div>
              <p className="text-[10px] font-mono-gs uppercase tracking-widest opacity-40 mt-1">Click a bar to view list</p>
            </div>
            <div style={{ height: 160 }} className="cursor-pointer">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>

          {/* Band Drill-down Modal/Section */}
          {activeBand && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl" 
                   style={{ background: 'var(--gs-bg)', border: '1px solid var(--gs-border)' }}>
                <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--gs-border)' }}>
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--gs-text)' }}>{activeBand} Contributors</h2>
                    <p className="text-xs font-mono-gs" style={{ color: 'var(--gs-text-muted)' }}>{bandContributors.length} matching developers found</p>
                  </div>
                  <button onClick={() => setActiveBand(null)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {bandContributors.map(c => {
                    const color = getHealthColor(c.health_score);
                    return (
                      <div key={c.login} className="flex items-center gap-4 p-3 rounded-xl transition-all hover:translate-x-1" 
                           style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                        <img src={c.avatar_url} alt={c.login} className="w-10 h-10 rounded-full" style={{ border: `2px solid ${color}` }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono-gs text-sm font-bold truncate" style={{ color }}>{c.login}</div>
                          <div className="font-mono-gs text-[10px]" style={{ color: 'var(--gs-text-muted)' }}>Velocity: {c.velocity_score}% · PR Rate: {c.pr_score}%</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono-gs text-lg font-bold" style={{ color }}>{c.health_score}</span>
                          <Sparkline data={c.weekly_commits} color={color} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-4 border-t text-center" style={{ borderColor: 'var(--gs-border)' }}>
                  <button onClick={() => setActiveBand(null)} 
                          className="px-6 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-80 active:scale-95"
                          style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)', color: 'var(--gs-text)' }}>
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Active */}
            <div className="rounded-xl p-6" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
              <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--gs-text-muted)' }}>Most Active This Period</div>
              <div className="space-y-4">
                {topByVelocity.map((c, i) => {
                  const color = getHealthColor(c.health_score);
                  return (
                    <div key={c.login} className="flex items-center gap-4">
                      <span className="font-mono-gs text-xs font-bold w-5 text-center" style={{ color: 'var(--gs-text-muted)' }}>#{i+1}</span>
                      <img src={c.avatar_url} alt={c.login} className="w-9 h-9 rounded-full" style={{ border: `2px solid ${color}` }} />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono-gs text-sm font-bold truncate" style={{ color }}>{c.login}</div>
                        <div className="font-mono-gs text-[10px]" style={{ color: 'var(--gs-text-muted)' }}>Velocity: {c.velocity_score}%</div>
                      </div>
                      <div className="shrink-0"><Sparkline data={c.weekly_commits} color={color} /></div>
                    </div>
                  );
                })}
                {topByVelocity.length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--gs-text-2)' }}>No data available.</p>
                )}
              </div>
            </div>

            {/* Needs Attention */}
            <div className="rounded-xl p-6" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
              <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--gs-text-muted)' }}>Needs Attention</div>
              <div className="space-y-3">
                {needsAttention.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--gs-text-2)' }}>No contributors need attention. 🎉</p>
                ) : needsAttention.map(c => (
                  <div key={c.login} className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)' }}>
                    <img src={c.avatar_url} alt={c.login} className="w-8 h-8 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono-gs text-sm font-bold truncate" style={{ color: 'var(--gs-red)' }}>{c.login}</div>
                      <div className="font-mono-gs text-[10px]" style={{ color: 'var(--gs-text-muted)' }}>{getLowestSignal(c)}</div>
                    </div>
                    <span className="font-mono-gs text-xs font-bold px-2 py-0.5 rounded"
                      style={{ background: 'rgba(248,81,73,0.15)', color: 'var(--gs-red)' }}>
                      {c.health_score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="rounded-xl p-6" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
            <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--gs-text-muted)' }}>Activity Heatmap</div>
            <div className="font-bold text-xl mb-5" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>12-Week Commit Density</div>
            <div className="flex gap-2">
              {/* Day labels */}
              <div className="flex flex-col gap-1 justify-around mr-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                  <span key={d} className="font-mono-gs text-[9px] leading-none" style={{ color: 'var(--gs-text-muted)', width: 24 }}>{d}</span>
                ))}
              </div>
              {/* Grid */}
              <div className="flex gap-1 flex-1">
                {Array.from({length:12}, (_,weekIdx) => (
                  <div key={weekIdx} className="flex flex-col gap-1 flex-1">
                    <span className="font-mono-gs text-[8px] leading-none text-center mb-1 truncate" style={{ color: 'var(--gs-text-2)' }}>
                      {weekLabels[weekIdx]}
                    </span>
                    {heatmapData.map((dayRow, dayIdx) => {
                      const v = dayRow[weekIdx];
                      const intensity = v / maxHeat;
                      const bg = intensity === 0
                        ? 'var(--gs-surface)'
                        : `rgba(46,160,67,${Math.max(0.15, intensity)})`;
                      return (
                        <div key={dayIdx} title={`${v} commits`}
                          className="rounded-sm"
                          style={{ background: bg, height: 12, minWidth: 0 }} />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 justify-end">
              <span className="font-mono-gs text-[10px]" style={{ color: 'var(--gs-text-muted)' }}>Less</span>
              {[0, 0.25, 0.5, 0.75, 1].map(i => (
                <div key={i} className="w-3 h-3 rounded-sm"
                  style={{ background: i === 0 ? 'var(--gs-surface)' : `rgba(46,160,67,${i})` }} />
              ))}
              <span className="font-mono-gs text-[10px]" style={{ color: 'var(--gs-text-muted)' }}>More</span>
            </div>
          </div>
        </div>
      )}
    </RepoLayout>
  );
};

export default OverviewPage;
