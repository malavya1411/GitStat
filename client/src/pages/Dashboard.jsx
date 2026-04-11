import React, { useState, useEffect, useRef } from 'react';
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

const TRENDING_REPOS = [
  { full_name: 'tensorflow/tensorflow', language: 'Python', stars: '176k', forks: '88k', desc: 'An open source machine learning framework for everyone.' },
  { full_name: 'freeCodeCamp/freeCodeCamp', language: 'TypeScript', stars: '386k', forks: '35k', desc: 'freeCodeCamp.org\'s open-source codebase and curriculum.' },
  { full_name: 'vuejs/vue', language: 'JavaScript', stars: '204k', forks: '33k', desc: 'Vue.js is a progressive, incrementally-adoptable JavaScript framework...' },
  { full_name: 'facebook/react', language: 'JavaScript', stars: '210k', forks: '44k', desc: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.' },
];

const FILTER_GROUPS = [
  { label: 'Language', items: ['JavaScript', 'Python', 'TypeScript', 'Rust', 'Go', 'Java', 'C++', 'Ruby', 'Swift', 'Kotlin'] },
  { label: 'Domain', items: ['AI / ML', 'Web Dev', 'Mobile', 'DevTools', 'Blockchain', 'Gaming', 'Data Science', 'Cybersecurity', 'Cloud', 'Open Hardware'] },
  { label: 'Difficulty', items: ['Good First Issues', 'Beginner Friendly', 'Intermediate', 'Advanced'] },
  { label: 'Repo Health', items: ['Active (pushed < 7 days)', 'Well Documented', 'High Star Count', 'Small & Focused'] }
];

const SORT_OPTIONS = ['Most Stars', 'Recently Updated', 'Most Issues', 'Best for Newcomers'];

const getDateDaysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

const buildSearchQuery = (userQuery, activeFilters) => {
  let q = userQuery;

  const languageMap = {
    'JavaScript': 'language:JavaScript', 'Python': 'language:Python', 'TypeScript': 'language:TypeScript',
    'Rust': 'language:Rust', 'Go': 'language:Go', 'Java': 'language:Java', 'C++': 'language:C++',
    'Ruby': 'language:Ruby', 'Swift': 'language:Swift', 'Kotlin': 'language:Kotlin'
  };
  const domainMap = {
    'AI / ML': 'topic:machine-learning', 'Web Dev': 'topic:web', 'Mobile': 'topic:mobile',
    'DevTools': 'topic:developer-tools', 'Blockchain': 'topic:blockchain', 'Gaming': 'topic:game',
    'Data Science': 'topic:data-science', 'Cybersecurity': 'topic:security', 'Cloud': 'topic:cloud',
    'Open Hardware': 'topic:hardware'
  };
  const difficultyMap = {
    'Good First Issues': 'good-first-issues:>2', 'Beginner Friendly': 'topic:beginner-friendly',
    'Intermediate': 'topic:intermediate', 'Advanced': 'topic:advanced'
  };
  const healthMap = {
    'Active (pushed < 7 days)': 'pushed:>' + getDateDaysAgo(7), 'Well Documented': 'topic:documentation',
    'High Star Count': 'stars:>1000', 'Small & Focused': 'size:<5000'
  };

  activeFilters.forEach(filter => {
    const qualifier = languageMap[filter] || domainMap[filter] || difficultyMap[filter] || healthMap[filter];
    if (qualifier) q += ` ${qualifier}`;
  });

  return q.trim();
};

const getLanguageBadge = (lang) => {
  if (!lang) return null;
  const map = {
    'JavaScript': 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    'Python': 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    'TypeScript': 'bg-blue-400/20 text-blue-400 border-blue-400/30',
    'Rust': 'bg-orange-500/20 text-orange-500 border-orange-500/30',
    'Go': 'bg-teal-500/20 text-teal-500 border-teal-500/30',
  };
  const style = map[lang] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  return <span className={`px-2 py-0.5 rounded text-[9px] border uppercase tracking-widest font-mono-gs ${style}`}>{lang}</span>;
};

const getFriendlinessBadge = (repo) => {
  const issues = repo.open_issues_count || 0;
  const stars = repo.stargazers_count || 0;
  
  if (issues > 10 && stars > 100 && stars < 50000) {
    return <span className="px-2 py-0.5 rounded text-[9px] border bg-green-500/20 text-green-400 border-green-500/30 uppercase tracking-widest font-mono-gs">Good to contribute</span>;
  }
  if (stars > 50000) {
    return <span className="px-2 py-0.5 rounded text-[9px] border bg-amber-500/20 text-amber-500 border-amber-500/30 uppercase tracking-widest font-mono-gs">Large project</span>;
  }
  if (issues < 3) {
    return <span className="px-2 py-0.5 rounded text-[9px] border bg-gray-500/20 text-gray-400 border-gray-500/30 uppercase tracking-widest font-mono-gs">Low activity</span>;
  }
  return null;
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);
  const [sortOption, setSortOption] = useState('Most Stars');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const searchContainerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (window.innerWidth > 768) inputRef.current?.focus();
  }, []);

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

  const toggleFilter = (filter) => {
    setActiveFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]);
  };

  const performSearch = async (overrideQuery = query) => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const finalQuery = buildSearchQuery(overrideQuery, activeFilters);
      if (!finalQuery) {
        setSearchResults([]);
        return;
      }
      const response = await axios.get(`${API_BASE_URL}/api/search-repos?q=${encodeURIComponent(finalQuery)}`);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim() || activeFilters.length > 0) {
      if (query.includes('/') && activeFilters.length === 0) {
        navigate(`/repo/${query.trim()}`);
      } else {
        performSearch();
      }
    }
  };

  // Trigger search dynamically when filters change
  useEffect(() => {
    if (activeFilters.length > 0) {
      performSearch();
    } else if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
    } else if (hasSearched) {
      performSearch();
    }
  }, [activeFilters]);

  // Client-side sort
  const sortedResults = [...searchResults].sort((a, b) => {
    if (sortOption === 'Most Stars') return (b.stargazers_count || 0) - (a.stargazers_count || 0);
    if (sortOption === 'Recently Updated') return new Date(b.pushed_at || b.updated_at || 0) - new Date(a.pushed_at || a.updated_at || 0);
    if (sortOption === 'Most Issues') return (b.open_issues_count || 0) - (a.open_issues_count || 0);
    if (sortOption === 'Best for Newcomers') {
      const score = (repo) => (repo.open_issues_count > 10 && repo.stargazers_count > 100 && repo.stargazers_count < 50000) ? 1 : 0;
      return score(b) - score(a);
    }
    return 0;
  });

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--gs-bg)', color: 'var(--gs-text)' }}>
      <div className="noise-overlay" aria-hidden="true" />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        <svg width="100%" height="400" viewBox="0 0 1200 400" className="absolute top-[50%] -translate-y-1/2 opacity-30">
           <path d="M-100,200 L300,200 C400,200 450,120 550,120 L750,120 C850,120 900,200 1000,200 L1300,200" fill="none" stroke="rgba(188,140,255,1)" strokeWidth="3" />
           <path d="M300,200 C350,200 400,260 500,260 L800,260 C900,260 950,200 1000,200" fill="none" stroke="rgba(46,160,67,1)" strokeWidth="3" />
           <circle cx="300" cy="200" r="6" fill="var(--gs-bg)" stroke="rgba(188,140,255,1)" strokeWidth="2" />
           <circle cx="750" cy="120" r="6" fill="var(--gs-bg)" stroke="rgba(188,140,255,1)" strokeWidth="2" />
           <circle cx="1000" cy="200" r="6" fill="var(--gs-bg)" stroke="rgba(188,140,255,1)" strokeWidth="2" />
        </svg>
        
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[rgba(188,140,255,0.15)] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[rgba(46,160,67,0.15)] rounded-full blur-[120px]" />
      </div>

      <header className="absolute top-0 z-50 w-full bg-transparent">
        <div className="flex items-center justify-between px-6 h-20 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgba(188,140,255,1)] to-[rgba(46,160,67,1)] flex items-center justify-center font-black text-black">
              G
            </div>
            <span className="text-xl font-black tracking-tighter" style={{ fontFamily: "'Geist Sans', sans-serif" }}>GitStat</span>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" onClick={toggleTheme} className="flex items-center justify-center w-10 h-10 rounded-full transition-all hover:opacity-80 active:scale-95" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--gs-border)', color: 'var(--gs-text-secondary)' }}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <div className="flex items-center gap-2 bg-[rgba(255,255,255,0.05)] border border-[var(--gs-border)] px-3 py-1.5 rounded-full">
              <span className="text-xs font-mono-gs text-[var(--gs-text-secondary)]">{user?.username}</span>
              {user?.avatarUrl && <img src={user.avatarUrl} alt={user.username} className="w-5 h-5 rounded-full" />}
            </div>
            <button type="button" onClick={logout} className="px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:bg-white hover:text-black active:scale-95" style={{ border: '1px solid var(--gs-text)' }}>
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full mx-auto px-6 pt-32 pb-16 flex flex-col items-center justify-start">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3 text-center bg-clip-text text-transparent bg-gradient-to-r from-[rgba(188,140,255,1)] via-[rgba(94,92,230,1)] to-[rgba(46,160,67,1)] py-2" style={{ fontFamily: "'Geist Sans', sans-serif" }}>
          Repository Explorer
        </h1>
        <p className="font-mono-gs text-xs mb-8 text-center max-w-xl" style={{ color: 'var(--gs-text-2)' }}>
          Search any public GitHub repository to analyze contributor health, burnout risk, and knowledge concentration.
        </p>

        <div className="w-full max-w-4xl mb-4 relative z-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
            <div className="w-full flex-1">
              <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
                {FILTER_GROUPS.map((group) => (
                  <div key={group.label} className="flex flex-col gap-2">
                    <span className="text-[11px] uppercase tracking-widest text-[var(--gs-text-muted)] font-mono-gs">{group.label}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {group.items.map(item => {
                        const isActive = activeFilters.includes(item);
                        return (
                          <button
                            key={item}
                            onClick={() => toggleFilter(item)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                              isActive 
                                ? 'bg-[var(--gs-green)] text-black border-[var(--gs-green)] border' 
                                : 'bg-transparent border border-[var(--gs-border)] text-[var(--gs-text-secondary)] hover:border-[var(--gs-text-secondary)]'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {hasSearched && sortedResults.length > 0 && (
              <div className="flex flex-col shrink-0">
                <span className="text-[11px] uppercase tracking-widest text-[var(--gs-text-muted)] font-mono-gs mb-2">Sort By</span>
                <select 
                  value={sortOption} 
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-[var(--gs-surface)] border border-[var(--gs-border)] text-sm rounded-lg px-3 py-1.5 outline-none font-mono-gs text-[var(--gs-text-secondary)]"
                >
                  {SORT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <div ref={searchContainerRef} className="w-full max-w-4xl mb-12 relative z-30">
          <form onSubmit={handleSearchSubmit}>
            <div className="flex items-center p-4 rounded-xl shadow-2xl transition-all duration-300" style={{ background: 'var(--gs-surface)', border: `1px solid ${activeFilters.length > 0 ? 'var(--gs-green)' : 'var(--gs-border)'}` }}>
              <span style={{ color: 'var(--gs-green)' }} className="mr-4 shrink-0">
                {isSearching ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                )}
              </span>
              <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search any public GitHub repo..."
                className="bg-transparent border-none outline-none w-full text-lg font-mono-gs"
                style={{ color: 'var(--gs-text)', fontFamily: "'JetBrains Mono', monospace" }}
                autoComplete="off" spellCheck="false" 
              />
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded ml-2" style={{ background: 'var(--gs-surface-high)', border: '1px solid var(--gs-border)' }}>
                <span className="font-mono-gs text-[10px] uppercase tracking-tighter" style={{ color: 'var(--gs-text-2)' }}>Enter</span>
              </div>
            </div>
          </form>
        </div>

        <div className="w-full max-w-4xl z-10 transition-all">
          {hasSearched ? (
            sortedResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedResults.map(repo => (
                  <button key={repo.id} onClick={() => navigate(`/repo/${repo.full_name}`)}
                    className="p-5 flex flex-col items-start text-left group hover:border-[var(--gs-green)] rounded-xl transition-colors w-full"
                    style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                    <div className="flex items-center justify-between w-full mb-3">
                      <span className="text-sm font-bold truncate group-hover:text-[var(--gs-green)]" style={{ color: 'var(--gs-text)' }}>{repo.full_name}</span>
                      {getLanguageBadge(repo.language)}
                    </div>
                    <p className="text-xs mb-4 line-clamp-2" style={{ color: 'var(--gs-text-2)' }}>{repo.description || 'No description available.'}</p>
                    <div className="flex items-center gap-4 text-[10px] uppercase font-mono-gs tracking-widest w-full">
                      <span className="text-[var(--gs-text-muted)]">★ {repo.stargazers_count > 1000 ? (repo.stargazers_count/1000).toFixed(1)+'k' : repo.stargazers_count}</span>
                      <span className="text-[var(--gs-text-muted)]">𐄂 {repo.open_issues_count || 0} issues</span>
                      <div className="ml-auto flex shrink-0">
                        {getFriendlinessBadge(repo)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-6 border border-dashed rounded-2xl" style={{ borderColor: 'var(--gs-border)' }}>
                <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--gs-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-sm font-mono-gs mb-2" style={{ color: 'var(--gs-text)' }}>No repositories found matching your filters.</p>
                <p className="text-xs mb-6" style={{ color: 'var(--gs-text-2)' }}>Try removing some filters or broadening your search.</p>
                <button onClick={() => { setActiveFilters([]); setQuery(''); setHasSearched(false); }} className="px-6 py-2 rounded-full text-xs font-bold transition-all bg-[var(--gs-surface-high)] hover:bg-[var(--gs-text)] hover:text-black" style={{ border: '1px solid var(--gs-border)' }}>
                  Clear all filters
                </button>
              </div>
            )
          ) : (
            <>
              <h2 className="font-mono-gs text-xs uppercase tracking-[0.3em] mb-6 text-center" style={{ color: 'var(--gs-text-2)' }}>Trending Repositories</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TRENDING_REPOS.map(repo => (
                  <button key={repo.full_name} onClick={() => navigate(`/repo/${repo.full_name}`)}
                    className="devpulse-card p-6 flex flex-col text-left group hover:border-[var(--gs-green)] rounded-xl"
                    style={{ background: 'var(--gs-card)' }}>
                    <div className="flex items-center gap-3 mb-4">
                      <img src={`https://github.com/${repo.full_name.split('/')[0]}.png`} className="w-5 h-5 rounded-md" alt="Avatar"/>
                      <span className="text-sm font-bold font-mono-gs group-hover:text-[var(--gs-green)] transition-colors">{repo.full_name}</span>
                    </div>
                    <p className="text-xs text-[var(--gs-text-2)] mb-4 flex-1 line-clamp-2">{repo.desc}</p>
                    <div className="flex items-center gap-4 text-[9px] font-mono-gs uppercase tracking-widest text-[var(--gs-text-muted)]">
                      <span>{repo.language}</span>
                      <span className="flex items-center gap-1">★ {repo.stars}</span>
                      <span className="flex items-center gap-1">⤴ {repo.forks}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="h-10 px-6 flex items-center justify-between border-t border-[var(--gs-border)] text-[9px] font-mono-gs uppercase tracking-widest" style={{ background: 'var(--gs-bg)', color: 'var(--gs-text-muted)' }}>
        <div className="flex gap-4"><span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-gs-green" /> Operational</span><span>Sovereign Intel v2.4</span></div>
        <div className="flex gap-4"><a href="#" className="hover:text-[var(--gs-text)] transition-colors">Privacy</a><a href="#" className="hover:text-[var(--gs-text)] transition-colors">Terms</a></div>
      </footer>
    </div>
  );
};

export default Dashboard;
