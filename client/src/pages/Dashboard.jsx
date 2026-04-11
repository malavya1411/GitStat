import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

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

const TRENDING_REPOS = [
  { full_name: 'tensorflow/tensorflow', language: 'Python', stars: '176k', forks: '88k', desc: 'An open source machine learning framework for everyone.' },
  { full_name: 'microsoft/vscode', language: 'TypeScript', stars: '148k', forks: '26k', desc: 'Visual Studio Code.' },
  { full_name: 'vuejs/vue', language: 'JavaScript', stars: '204k', forks: '33k', desc: 'Vue.js is a progressive, incrementally-adoptable JavaScript framework...' },
  { full_name: 'facebook/react', language: 'JavaScript', stars: '210k', forks: '44k', desc: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.' },
];

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [dropdownResults, setDropdownResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const searchContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Focus search on mount (unless mobile)
  useEffect(() => {
    if (window.innerWidth > 768) inputRef.current?.focus();
  }, []);

  // Handle click outside search results
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut (CMD/CTRL + K) to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced autocomplete search
  useEffect(() => {
    if (query.trim().length < 2) {
      setDropdownResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setDropdownLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/search-repos?q=${encodeURIComponent(query)}`);
        setDropdownResults(response.data.slice(0, 6));
        setShowDropdown(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setDropdownLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // If user types 'owner/repo' directly, navigate there
      if (query.includes('/')) {
        navigate(`/repo/${query.trim()}`);
      }
    }
  };

  const handleSelectRepo = (repo) => {
    navigate(`/repo/${repo.full_name}`);
    setShowDropdown(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--gs-bg)', color: 'var(--gs-text)' }}>
      <div className="noise-overlay" aria-hidden="true" />
      
      {/* Branching Timeline SVG Background & Glows purely for visual aesthetics */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        {/* Branching Lines */}
        <svg width="100%" height="400" viewBox="0 0 1200 400" className="absolute top-[50%] -translate-y-1/2 opacity-30">
           <path d="M-100,200 L300,200 C400,200 450,120 550,120 L750,120 C850,120 900,200 1000,200 L1300,200" fill="none" stroke="rgba(188,140,255,1)" strokeWidth="3" />
           <path d="M300,200 C350,200 400,260 500,260 L800,260 C900,260 950,200 1000,200" fill="none" stroke="rgba(46,160,67,1)" strokeWidth="3" />
           <circle cx="300" cy="200" r="6" fill="var(--gs-bg)" stroke="rgba(188,140,255,1)" strokeWidth="2" />
           <circle cx="750" cy="120" r="6" fill="var(--gs-bg)" stroke="rgba(188,140,255,1)" strokeWidth="2" />
           <circle cx="1000" cy="200" r="6" fill="var(--gs-bg)" stroke="rgba(188,140,255,1)" strokeWidth="2" />
        </svg>
        
        {/* Glow Blobs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgba(188,140,255,0.15)] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[rgba(46,160,67,0.15)] rounded-full blur-[120px]" />
      </div>

      {/* Navbar merged seamlessly into background */}
      <header className="absolute top-0 z-50 w-full bg-transparent">
        <div className="flex items-center justify-between px-6 h-20 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgba(188,140,255,1)] to-[rgba(46,160,67,1)] flex items-center justify-center font-black text-black">
              G
            </div>
            <span className="text-xl font-black tracking-tighter" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>
              GitStat
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button type="button" id="theme-toggle" onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:opacity-80 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--gs-border)', color: 'var(--gs-text-secondary)' }}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.05)] border border-[var(--gs-border)] px-3 py-1.5 rounded-full">
              <span className="text-xs font-mono-gs text-[var(--gs-text-secondary)]">{user?.username}</span>
              <img src={user?.avatarUrl} alt={user?.username} className="w-5 h-5 rounded-full" />
            </div>
            <button type="button" id="logout-btn" onClick={logout} title="Sign out"
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:bg-white hover:text-black active:scale-95"
              style={{ border: '1px solid var(--gs-text)', color: 'var(--gs-text)' }}>
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 w-full mx-auto px-6 pt-32 pb-16 flex flex-col items-center justify-start">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3 text-center bg-clip-text text-transparent bg-gradient-to-r from-[rgba(188,140,255,1)] via-[rgba(94,92,230,1)] to-[rgba(46,160,67,1)] py-2"
          style={{ fontFamily: "'Geist Sans', sans-serif" }}>
          Repository Explorer
        </h1>
        <p className="font-mono-gs text-xs mb-10 text-center max-w-xl" style={{ color: 'var(--gs-text-2)' }}>
          Search any public GitHub repository to analyze contributor health, burnout risk, and knowledge concentration.
        </p>

        {/* Search with autocomplete */}
        <div ref={searchContainerRef} className="w-full max-w-2xl mb-16 relative">
          {/* Glow */}
          <div className="absolute inset-0 blur-3xl -z-10 rounded-full opacity-20"
            style={{ background: 'var(--gs-green)' }} aria-hidden="true" />

          <form onSubmit={handleSearch}>
            <div className="flex items-center p-4 rounded-xl shadow-2xl transition-all duration-300"
              style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)' }}>
              {/* Search icon or spinner */}
              <span style={{ color: 'var(--gs-green)' }} className="mr-4 shrink-0">
                {dropdownLoading ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                )}
              </span>
              <input ref={inputRef} type="text" id="repo-search-input" value={query}
                onChange={e => { setQuery(e.target.value); setShowDropdown(e.target.value.length >= 2); }}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (dropdownResults.length > 0 && query.length >= 2) setShowDropdown(true); }}
                placeholder="Search any public GitHub repo..."
                className="bg-transparent border-none outline-none w-full text-lg font-mono-gs"
                style={{ color: 'var(--gs-text)', fontFamily: "'JetBrains Mono', monospace" }}
                autoComplete="off" spellCheck="false" />
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded ml-2"
                style={{ background: 'var(--gs-surface-high)', border: '1px solid var(--gs-border)' }}>
                <span className="font-mono-gs text-[10px] uppercase tracking-tighter" style={{ color: 'var(--gs-text-2)' }}>⌘ K</span>
              </div>
            </div>
          </form>

          {/* Autocomplete dropdown */}
          {showDropdown && dropdownResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)' }}>
              {dropdownResults.map(repo => (
                <button key={repo.id} onClick={() => handleSelectRepo(repo)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--gs-surface-high)] transition-colors text-left border-b last:border-0 border-[var(--gs-border)]">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold" style={{ color: 'var(--gs-text)' }}>{repo.full_name}</span>
                    <span className="text-[10px] font-mono-gs uppercase tracking-widest" style={{ color: 'var(--gs-text-2)' }}>
                      {repo.language || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--gs-text-2)] text-xs">
                    <span>★</span>
                    <span>{repo.stargazers_count > 1000 ? (repo.stargazers_count/1000).toFixed(1) + 'k' : repo.stargazers_count}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Trending grid */}
        <div className="w-full max-w-[1240px]">
          <h2 className="font-mono-gs text-xs uppercase tracking-[0.3em] mb-8" style={{ color: 'var(--gs-text-2)' }}>Trending Repositories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TRENDING_REPOS.map(repo => (
              <button key={repo.full_name} onClick={() => navigate(`/repo/${repo.full_name}`)}
                className="devpulse-card p-6 flex flex-col text-left group hover:border-[var(--gs-green)]"
                style={{ background: 'var(--gs-card)' }}>
                <div className="flex items-center gap-3 mb-4">
                  {repo.full_name === 'tensorflow/tensorflow' ? (
                     <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                  ) : repo.full_name === 'microsoft/vscode' ? (
                     <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.706.202l-9.522 7.621-5.59-4.211a1.494 1.494 0 0 0-1.821.046L.141 4.3a1.494 1.494 0 0 0-.141 2.113L3.95 12 .002 17.587a1.494 1.494 0 0 0 .141 2.113l.564.425a1.494 1.494 0 0 0 1.821.046l5.59-4.211 9.522 7.621a1.494 1.494 0 0 0 1.706.202l4.94-2.377a1.494 1.494 0 0 0 .848-1.353V3.94a1.494 1.494 0 0 0-.848-1.353z"/></svg>
                  ) : repo.full_name === 'vuejs/vue' ? (
                     <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M24,1.6L12,22.4L0,1.6h4.8L12,14L19.2,1.6H24z M18.6,1.6L12,13L5.4,1.6H0L12,22.4L24,1.6H18.6z"/></svg>
                  ) : (
                     <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 5.084.153 7.159 1.139 2.167 1.03 3.125 3.012 3.86 5.568.188.653.307 1.319.381 1.99.117 1.066.117 1.45.1 2.516-.017.65-.084 1.3-.2 1.94-.74 4.075-2.915 6.942-6.52 7.72-.647.141-1.3.216-1.956.248-1.077.05-1.46.033-2.54.017-.655-.01-1.315-.05-1.966-.14-4.14-.567-7.22-3.14-8.086-7.398-.103-.503-.169-1.01-.205-1.52-.066-1.077-.046-1.46-.03-2.54.01-.655.05-1.315.137-1.966.697-5.143 4.25-8.498 9.362-9.429.625-.114 1.258-.17 1.898-.173zm.012 3.238c-3.16.03-5.26.11-7.14 1.06-2.03 1.03-3.13 3.01-3.69 5.51-.15.65-.24 1.3-.29 1.97-.08 1.07-.07 1.46-.04 2.54.02.66.07 1.32.17 1.97.66 4.3 3.24 6.88 7.37 7.33.66.07 1.33.09 2 .09 1.08.01 1.46.01 2.54 0 .67-.01 1.33-.06 2-.15 4.32-.53 7.07-3.41 7.42-7.7.04-.51.05-1.03.04-1.55-.03-1.08-.04-1.47-.09-2.55-.06-.67-.17-1.34-.33-2-.76-3.15-3.04-5.46-6.19-6.39-.7-.21-1.41-.33-2.13-.37-1.11-.08-1.5-.08-2.61-.04zm0 3.287c.78 0 1.41.63 1.41 1.41v1.59h2.39c.28 0 .5.22.5.5v1.22c0 .28-.22.5-.5.5h-2.39v4.22c0 .28-.22.5-.5.5h-1.81c-.28 0-.5-.22-.5-.5v-4.22h-1.81c-.28 0-.5-.22-.5-.5v-1.22c0-.28.22-.5.5-.5h1.81v-1.59c0-.78.63-1.41 1.41-1.41z"/></svg>
                  )}
                  <span className="text-xs font-mono-gs group-hover:text-[var(--gs-green)] transition-colors">{repo.full_name}</span>
                </div>
                <p className="text-[10px] text-[var(--gs-text-2)] mb-4 flex-1 line-clamp-2">{repo.desc}</p>
                <div className="flex items-center gap-4 text-[9px] font-mono-gs uppercase tracking-widest text-[var(--gs-text-muted)]">
                  <span>{repo.language}</span>
                  <span className="flex items-center gap-1">★ {repo.stars}</span>
                  <span className="flex items-center gap-1">⤴ {repo.forks}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Basic Status Bar footer */}
      <footer className="h-10 px-6 flex items-center justify-between border-t border-[var(--gs-border)] text-[9px] font-mono-gs uppercase tracking-widest"
        style={{ background: 'var(--gs-bg)', color: 'var(--gs-text-muted)' }}>
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gs-green" /> Operational</span>
          <span>Sovereign Intel v2.4</span>
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-[var(--gs-text)] transition-colors">Privacy</a>
          <a href="#" className="hover:text-[var(--gs-text)] transition-colors">Terms</a>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
