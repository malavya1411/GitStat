import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import RepoLayout from '../components/RepoLayout';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const statusStyle = (s) => {
  if (s === 'open')   return { color: 'var(--gs-green)',  bg: 'rgba(46,160,67,0.12)',   border: 'rgba(46,160,67,0.4)' };
  if (s === 'merged') return { color: 'var(--gs-purple)', bg: 'rgba(188,140,255,0.12)', border: 'rgba(188,140,255,0.4)' };
  return               { color: 'var(--gs-text-muted)',  bg: 'var(--gs-surface)',       border: 'var(--gs-border)' };
};

const getPRStatus = (pr) => {
  if (pr.merged_at) return 'merged';
  if (pr.state === 'open') return 'open';
  return 'closed';
};

const daysToMerge = (pr) => {
  if (!pr.merged_at) return null;
  const diff = new Date(pr.merged_at) - new Date(pr.created_at);
  return Math.max(0, +(diff / 86400000).toFixed(1));
};

const FILTERS = ['All', 'Open', 'Merged', 'Closed'];

const PullRequestsPage = () => {
  const { owner, repo } = useParams();
  const [pulls, setPulls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');

  const load = () => {
    setLoading(true); setError('');
    axios.get(`${API_BASE_URL}/api/repo/${owner}/${repo}/pulls`)
      .then(r => setPulls(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load pull requests.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [owner, repo]);

  const filtered = useMemo(() => {
    let list = [...pulls].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    if (filter === 'Open')   return list.filter(p => getPRStatus(p) === 'open');
    if (filter === 'Merged') return list.filter(p => getPRStatus(p) === 'merged');
    if (filter === 'Closed') return list.filter(p => getPRStatus(p) === 'closed');
    return list;
  }, [pulls, filter]);

  const summary = useMemo(() => {
    const open = pulls.filter(p => getPRStatus(p) === 'open').length;
    const merged = pulls.filter(p => getPRStatus(p) === 'merged').length;
    const closed = pulls.filter(p => getPRStatus(p) === 'closed').length;
    const mergedPRs = pulls.filter(p => p.merged_at);
    const avgDays = mergedPRs.length > 0
      ? (mergedPRs.reduce((s,p) => s + daysToMerge(p), 0) / mergedPRs.length).toFixed(1)
      : '—';
    return { total: pulls.length, open, merged, closed, avgDays };
  }, [pulls]);

  return (
    <RepoLayout>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono-gs text-sm" style={{ color: 'var(--gs-text-muted)' }}>System / Repository / Pull Requests</span>
      </div>
      <div className="flex items-baseline gap-4 flex-wrap mb-8">
        <div className="flex items-baseline gap-4">
          <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>{repo}</h1>
          <span className="font-mono-gs text-xl" style={{ color: 'var(--gs-text-muted)' }}>/ Pull Requests</span>
        </div>
        {!loading && !error && pulls.length >= 100 && (
          <span className="text-[13px] font-medium" style={{ color: 'var(--gs-text-2)' }}>
            (Recent 100 pull requests have been shown)
          </span>
        )}
      </div>

      {/* Summary row */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total', value: summary.total },
            { label: 'Open', value: summary.open },
            { label: 'Merged', value: summary.merged },
            { label: 'Closed', value: summary.closed },
            { label: 'Avg to Merge', value: `${summary.avgDays}d` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
              <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--gs-text-muted)' }}>{label}</div>
              <div className="font-mono-gs text-2xl font-bold" style={{ color: 'var(--gs-text)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-xs font-bold font-mono-gs transition-all"
            style={{
              background: filter === f ? 'var(--gs-green)' : 'var(--gs-surface)',
              color: filter === f ? '#000' : 'var(--gs-text-2)',
              border: '1px solid var(--gs-border)',
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-5 mb-6 font-mono-gs text-sm flex items-center gap-4"
          style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.28)', color: 'var(--gs-red)' }}>
          {error}
          <button onClick={load} className="underline cursor-pointer">Retry</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({length:6}).map((_,i) => (
            <div key={i} className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
              <div className="skeleton w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--gs-border)' }}>
          {/* Header */}
          <div className="grid grid-cols-12 px-5 py-3 font-mono-gs text-[10px] uppercase tracking-widest"
            style={{ background: 'var(--gs-surface)', borderBottom: '1px solid var(--gs-border)', color: 'var(--gs-text-muted)' }}>
            <span className="col-span-5">Title</span>
            <span className="col-span-2">Author</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-2">Opened</span>
            <span className="col-span-1 text-right">Merge (d)</span>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-10 font-mono-gs text-sm" style={{ color: 'var(--gs-text-2)' }}>No pull requests found.</div>
          ) : filtered.map(pr => {
            const s = getPRStatus(pr);
            const { color, bg, border } = statusStyle(s);
            const d = daysToMerge(pr);
            return (
              <a key={pr.number} href={pr.html_url} target="_blank" rel="noreferrer"
                className="grid grid-cols-12 px-5 py-4 items-center no-underline transition-all duration-150 cursor-pointer"
                style={{ borderBottom: '1px solid var(--gs-border-subtle)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--gs-surface)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span className="col-span-5 text-sm font-medium truncate pr-4" style={{ color: 'var(--gs-text)' }}>
                  <span className="font-mono-gs text-xs mr-2" style={{ color: 'var(--gs-text-muted)' }}>#{pr.number}</span>
                  {pr.title}
                </span>
                <span className="col-span-2 flex items-center gap-2">
                  <img src={pr.user.avatar_url} alt={pr.user.login} className="w-6 h-6 rounded-full" />
                  <span className="font-mono-gs text-xs truncate" style={{ color: 'var(--gs-text-2)' }}>{pr.user.login}</span>
                </span>
                <span className="col-span-2">
                  <span className="font-mono-gs text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                    style={{ color, background: bg, border: `1px solid ${border}` }}>
                    {s}
                  </span>
                </span>
                <span className="col-span-2 font-mono-gs text-xs" style={{ color: 'var(--gs-text-2)' }}>
                  {new Date(pr.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'2-digit' })}
                </span>
                <span className="col-span-1 font-mono-gs text-xs text-right" style={{ color: d !== null ? 'var(--gs-text)' : 'var(--gs-text-muted)' }}>
                  {d !== null ? d : '—'}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </RepoLayout>
  );
};

export default PullRequestsPage;
