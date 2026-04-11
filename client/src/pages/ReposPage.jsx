import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const langColor = (lang) => {
  const map = { JavaScript:'#f1e05a', TypeScript:'#3178c6', Python:'#3572A5', Go:'#00ADD8',
    Rust:'#dea584', Java:'#b07219', Ruby:'#701516', CSS:'#563d7c', HTML:'#e34c26',
    'C++':'#f34b7d', Swift:'#F05138', Kotlin:'#A97BFF' };
  return map[lang] || '#8b949e';
};

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

const SORT_OPTIONS = ['Stars', 'Updated', 'Name'];

const ReposPage = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [langFilter, setLangFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Updated');
  const [analyzed, setAnalyzed] = useState(new Set());

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/repos`)
      .then(r => setRepos(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to fetch your repositories.'))
      .finally(() => setLoading(false));
  }, []);

  const languages = useMemo(() => {
    const langs = new Set(repos.map(r => r.language).filter(Boolean));
    return ['All', ...Array.from(langs).sort()];
  }, [repos]);

  const filtered = useMemo(() => {
    let list = repos.filter(r => {
      if (langFilter !== 'All' && r.language !== langFilter) return false;
      if (searchQ && !r.full_name.toLowerCase().includes(searchQ.toLowerCase())) return false;
      return true;
    });
    if (sortBy === 'Stars') list = [...list].sort((a,b) => b.stargazers_count - a.stargazers_count);
    else if (sortBy === 'Updated') list = [...list].sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
    else if (sortBy === 'Name') list = [...list].sort((a,b) => a.name.localeCompare(b.name));
    return list;
  }, [repos, langFilter, searchQ, sortBy]);

  const handleAnalyze = (repo) => {
    setAnalyzed(prev => new Set([...prev, repo.full_name]));
    navigate(`/repo/${repo.full_name}`);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--gs-bg)', color: 'var(--gs-text)' }}>
      <div className="noise-overlay" aria-hidden="true" />
      {/* Navbar */}
      <header className="gs-navbar sticky top-0 z-50 w-full">
        <div className="flex items-center justify-between px-6 h-16 max-w-[1440px] mx-auto">
          <button type="button" onClick={() => navigate('/dashboard')}
            className="text-xl font-black tracking-tighter select-none transition-opacity hover:opacity-80"
            style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)', background: 'none', border: 'none', cursor: 'pointer' }}>
            GitStat
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all hover:opacity-80"
              style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)', color: 'var(--gs-text-2)' }}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            {user && <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full" style={{ border: '2px solid var(--gs-border)' }} />}
            <button type="button" onClick={logout} className="flex items-center justify-center w-9 h-9 rounded-lg transition-all hover:opacity-80"
              style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)', color: 'var(--gs-text-2)' }}>
              <LogOutIcon />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 py-12">
        <div className="flex justify-between items-baseline mb-3">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>Your Repositories</h1>
          <button onClick={() => navigate('/network')} className="px-4 py-2 font-mono-gs text-xs uppercase tracking-widest font-black rounded-lg transition-transform hover:scale-105 active:scale-95" style={{ background: 'var(--gs-purple)', color: '#fff' }}>Cross-Repo Radar</button>
        </div>
        <p className="font-mono-gs text-xs uppercase tracking-widest mb-10" style={{ color: 'var(--gs-text-2)' }}>
          {repos.length} repositories · sorted by {sortBy.toLowerCase()}
        </p>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <input type="text" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Filter by name..." className="rounded-lg px-4 py-2 text-sm outline-none font-mono-gs"
            style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)', color: 'var(--gs-text)', width: 220 }} />
          <select value={langFilter} onChange={e => setLangFilter(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none font-mono-gs"
            style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)', color: 'var(--gs-text)' }}>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <div className="flex gap-1">
            {SORT_OPTIONS.map(s => (
              <button key={s} type="button" onClick={() => setSortBy(s)}
                className="px-3 py-2 rounded-lg text-xs font-mono-gs font-bold transition-all"
                style={{
                  background: sortBy === s ? 'var(--gs-green)' : 'var(--gs-surface)',
                  color: sortBy === s ? '#000' : 'var(--gs-text-2)',
                  border: '1px solid var(--gs-border)',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl p-5 mb-8 font-mono-gs text-sm" style={{ background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.28)', color: 'var(--gs-red)' }}>
            {error}
            <button onClick={() => { setError(''); setLoading(true); axios.get(`${API_BASE_URL}/api/repos`).then(r=>setRepos(r.data)).catch(()=>{}).finally(()=>setLoading(false)); }}
              className="ml-4 underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({length:6}).map((_,i) => (
              <div key={i} className="rounded-xl p-6 space-y-3" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                <div className="skeleton h-5 w-40 rounded" />
                <div className="skeleton h-4 w-full rounded" />
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-8 w-24 rounded-lg mt-4" />
              </div>
            ))}
          </div>
        )}

        {/* Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(repo => (
              <div key={repo.full_name} className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-200"
                style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gs-green)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gs-border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-mono-gs font-bold text-sm leading-tight truncate"
                    style={{ color: 'var(--gs-green)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {repo.name}
                  </h3>
                  <div className="flex gap-2 shrink-0">
                    {analyzed.has(repo.full_name) && (
                      <span className="font-mono-gs text-[9px] px-2 py-0.5 rounded-full font-bold"
                        style={{ background: 'rgba(46,160,67,0.15)', color: 'var(--gs-green)', border: '1px solid var(--gs-green)' }}>
                        ANALYZED
                      </span>
                    )}
                    {repo.private && (
                      <span className="font-mono-gs text-[9px] px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--gs-surface-high)', color: 'var(--gs-text-muted)' }}>
                        PRIVATE
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--gs-text-2)', minHeight: 32 }}>
                  {repo.description || 'No description.'}
                </p>
                <div className="flex items-center gap-3 text-xs font-mono-gs" style={{ color: 'var(--gs-text-muted)' }}>
                  {repo.language && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: langColor(repo.language) }} />
                      {repo.language}
                    </span>
                  )}
                  <span>★ {repo.stargazers_count}</span>
                  <span>{new Date(repo.updated_at).toLocaleDateString('en-US', { month:'short', day:'numeric' })}</span>
                </div>
                <button type="button" onClick={() => handleAnalyze(repo)}
                  className="mt-1 w-full py-2 rounded-lg text-xs font-bold transition-all hover:opacity-80 active:scale-95"
                  style={{ background: 'var(--gs-green)', color: '#000', fontFamily: "'Geist Sans', sans-serif" }}>
                  Analyze →
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-16 font-mono-gs text-sm" style={{ color: 'var(--gs-text-2)' }}>
                No repositories match your filters.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReposPage;
