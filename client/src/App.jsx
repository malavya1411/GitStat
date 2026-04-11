import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import RepoAnalysis from './pages/RepoAnalysis';
import OverviewPage from './pages/OverviewPage';
import ReposPage from './pages/ReposPage';
import PullRequestsPage from './pages/PullRequestsPage';
import DeploymentsPage from './pages/DeploymentsPage';
import NetworkGraphPage from './pages/NetworkGraphPage';
import RepoComparePage from './pages/RepoComparePage';
import DeepAnalysisPage from './pages/DeepAnalysisPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen w-screen items-center justify-center" style={{ background: 'var(--gs-bg)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-t-transparent spin"
          style={{ borderColor: 'var(--gs-green)', borderTopColor: 'transparent' }} />
        <span className="font-mono-gs text-xs uppercase tracking-widest" style={{ color: 'var(--gs-text-2)' }}>
          Verifying session…
        </span>
      </div>
    </div>
  );
  return user ? children : <Navigate to="/" />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/repos" element={<PrivateRoute><ReposPage /></PrivateRoute>} />
      <Route path="/repo/:owner/:repo" element={<PrivateRoute><RepoAnalysis /></PrivateRoute>} />
      <Route path="/repo/:owner/:repo/overview" element={<PrivateRoute><OverviewPage /></PrivateRoute>} />
      <Route path="/repo/:owner/:repo/deep-analysis" element={<PrivateRoute><DeepAnalysisPage /></PrivateRoute>} />
      <Route path="/repo/:owner/:repo/pulls" element={<PrivateRoute><PullRequestsPage /></PrivateRoute>} />
      <Route path="/repo/:owner/:repo/deployments" element={<PrivateRoute><DeploymentsPage /></PrivateRoute>} />
      <Route path="/repo/:owner/:repo/compare" element={<PrivateRoute><RepoComparePage /></PrivateRoute>} />
      <Route path="/network" element={<PrivateRoute><NetworkGraphPage /></PrivateRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="min-h-screen" style={{ fontFamily: "'Geist Sans', system-ui, sans-serif", background: 'var(--gs-bg)', color: 'var(--gs-text)' }}>
          <AppRoutes />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
