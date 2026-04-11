import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import RepoLayout from '../components/RepoLayout';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const statusStyle = (s) => {
  if (s === 'success') return { color: 'var(--gs-green)',  bg: 'rgba(46,160,67,0.12)',   border: 'rgba(46,160,67,0.4)' };
  if (s === 'failure' || s === 'error') return { color: 'var(--gs-red)', bg: 'rgba(248,81,73,0.12)', border: 'rgba(248,81,73,0.4)' };
  if (s === 'pending' || s === 'in_progress') return { color: 'var(--gs-amber)', bg: 'rgba(210,153,34,0.12)', border: 'rgba(210,153,34,0.4)' };
  return               { color: 'var(--gs-text-muted)',  bg: 'var(--gs-surface)',       border: 'var(--gs-border)' }; // inactive, etc.
};

const DeploymentsPage = () => {
  const { owner, repo } = useParams();
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true); setError('');
    axios.get(`${API_BASE_URL}/api/repo/${owner}/${repo}/deployments`)
      .then(r => setDeployments(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load deployments.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [owner, repo]);

  const summary = useMemo(() => {
    const total = deployments.length;
    const success = deployments.filter(d => d.status === 'success').length;
    const failure = deployments.filter(d => d.status === 'failure' || d.status === 'error').length;
    const rate = total > 0 ? Math.round((success / total) * 100) : 0;
    return { total, success, failure, rate };
  }, [deployments]);

  return (
    <RepoLayout>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono-gs text-sm" style={{ color: 'var(--gs-text-muted)' }}>System / Repository / Deployments</span>
      </div>
      <div className="flex items-baseline gap-4 flex-wrap mb-8">
        <h1 className="text-4xl font-black tracking-tighter" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>{repo}</h1>
        <span className="font-mono-gs text-xl" style={{ color: 'var(--gs-text-muted)' }}>/ Deployments</span>
      </div>

      {/* Summary row */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Deployments', value: summary.total },
            { label: 'Success', value: summary.success, color: 'var(--gs-green)' },
            { label: 'Failed/Error', value: summary.failure, color: 'var(--gs-red)' },
            { label: 'Success Rate', value: `${summary.rate}%` },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
              <div className="font-mono-gs text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--gs-text-muted)' }}>{label}</div>
              <div className="font-mono-gs text-2xl font-bold" style={{ color: color || 'var(--gs-text)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-5 mb-6 font-mono-gs text-sm flex items-center gap-4"
          style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.28)', color: 'var(--gs-red)' }}>
          {error}
          <button onClick={load} className="underline cursor-pointer">Retry</button>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--gs-border)] before:to-transparent">
          {Array.from({length:4}).map((_,i) => (
             <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-3 h-3 rounded-full border-4 border-[var(--gs-bg)] bg-[var(--gs-surface-high)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-6 -translate-x-[5px] md:relative md:left-auto" />
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                   <div className="flex justify-between mb-3"><div className="skeleton h-4 w-20 rounded" /><div className="skeleton h-4 w-12 rounded" /></div>
                   <div className="skeleton h-3 w-1/2 rounded" />
                </div>
             </div>
          ))}
        </div>
      )}

      {/* Timeline */}
      {!loading && !error && (
        deployments.length === 0 ? (
          <div className="text-center py-16 font-mono-gs text-sm" style={{ color: 'var(--gs-text-2)' }}>No deployments found for this repository.</div>
        ) : (
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-[var(--gs-border)] before:to-transparent pt-4">
            {deployments.map(dep => {
              const { color, bg, border } = statusStyle(dep.status);
              return (
                <div key={dep.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-3 h-3 rounded-full border-4 border-[var(--gs-bg)] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-6 -translate-x-[5px] md:relative md:left-auto z-10" style={{ backgroundColor: color }} />
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2rem)] p-5 rounded-xl transition-all duration-200"
                    style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = color; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gs-border)'; }}>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="font-mono-gs text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mr-2"
                          style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)' }}>
                          {dep.environment}
                        </span>
                        <span className="font-mono-gs text-[10px] uppercase font-bold px-2 py-0.5 rounded-full"
                          style={{ color, background: bg, border: `1px solid ${border}` }}>
                          {dep.status}
                        </span>
                      </div>
                      <span className="font-mono-gs text-xs text-right truncate overflow-hidden ml-2" style={{ color: 'var(--gs-text-muted)' }}>
                        {new Date(dep.created_at).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {dep.creator?.avatar_url && <img src={dep.creator.avatar_url} alt={dep.creator.login} className="w-6 h-6 rounded-full" />}
                        <span className="font-mono-gs text-xs" style={{ color: 'var(--gs-text-2)' }}>{dep.creator?.login || 'system'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono-gs" style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border-subtle)', color: 'var(--gs-text)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
                        {dep.ref}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </RepoLayout>
  );
};

export default DeploymentsPage;
