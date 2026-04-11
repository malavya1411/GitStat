import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

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

const NAV_ITEMS = [
  { key: 'overview',     label: 'Overview',       path: (o, r) => `/repo/${o}/${r}/overview` },
  { key: 'contributors', label: 'Contributors',   path: (o, r) => `/repo/${o}/${r}` },
  { key: 'pulls',        label: 'Pull Requests',  path: (o, r) => `/repo/${o}/${r}/pulls` },
  { key: 'deployments',  label: 'Deployments',    path: (o, r) => `/repo/${o}/${r}/deployments` },
  { key: 'compare',      label: 'Compare',        path: (o, r) => `/repo/${o}/${r}/compare` },
];

const RepoLayout = ({ children, searchSlot }) => {
  const { owner, repo } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Determine active nav item
  const activeKey = (() => {
    const p = location.pathname;
    if (p.endsWith('/overview')) return 'overview';
    if (p.endsWith('/pulls')) return 'pulls';
    if (p.endsWith('/deployments')) return 'deployments';
    if (p.endsWith('/compare')) return 'compare';
    return 'contributors';
  })();

  return (
    <div className="min-h-screen" style={{ background: 'var(--gs-bg)', color: 'var(--gs-text)' }}>
      <div className="noise-overlay" aria-hidden="true" />

      {/* ── Navbar ── */}
      <header className="gs-navbar sticky top-0 z-50 w-full">
        <div className="flex items-center justify-between px-6 h-16 max-w-[1440px] mx-auto">
          <button type="button" onClick={() => navigate('/dashboard')}
            className="text-xl font-black tracking-tighter transition-opacity hover:opacity-80"
            style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)', background: 'none', border: 'none', cursor: 'pointer' }}>
            GitStat
          </button>
          <div className="flex items-center gap-3">
            {searchSlot}
            <button type="button" id="theme-toggle-repo" onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all hover:opacity-80 active:scale-95"
              style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)', color: 'var(--gs-text-2)' }}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            {user && (
              <img src={user.avatarUrl} alt={user.username} className="w-8 h-8 rounded-full"
                style={{ border: '2px solid var(--gs-border)' }} />
            )}
            <button type="button" id="logout-btn-repo" onClick={logout} title="Sign out"
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all hover:opacity-80 active:scale-95"
              style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)', color: 'var(--gs-text-2)' }}>
              <LogOutIcon />
            </button>
          </div>
        </div>
      </header>

      <div className="flex max-w-[1440px] mx-auto">
        {/* ── Sidebar ── */}
        <aside className="hidden lg:flex flex-col h-[calc(100vh-4rem)] w-64 shrink-0 sticky top-16 py-8 font-mono-gs text-xs uppercase tracking-widest"
          style={{ background: 'var(--gs-bg-2)', borderRight: '1px solid var(--gs-border)' }}>
          <div className="px-6 mb-8">
            <div className="font-black normal-case tracking-tight text-base"
              style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>
              {repo || 'Sovereign Console'}
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--gs-text-muted)' }}>
              {owner ? `${owner}` : 'Elite Analysis v2.4'}
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 px-3">
            {NAV_ITEMS.map(({ key, label, path }) => {
              const isActive = key === activeKey;
              return (
                <button key={key} type="button"
                  onClick={() => navigate(path(owner, repo))}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150"
                  style={{
                    color: isActive ? 'var(--gs-green)' : 'var(--gs-text-2)',
                    background: isActive ? 'var(--gs-card)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--gs-green)' : '3px solid transparent',
                    cursor: 'pointer',
                  }}>
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="px-6 mt-auto">
            <button type="button" onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold normal-case tracking-normal transition-opacity hover:opacity-80"
              style={{ background: 'var(--gs-green)', color: '#000' }}>
              <BackIcon /> Back to Search
            </button>
          </div>
        </aside>

        {/* ── Page content ── */}
        <main className="flex-1 min-h-screen p-8 lg:p-12">
          {children}
        </main>
      </div>
    </div>
  );
};

export default RepoLayout;
