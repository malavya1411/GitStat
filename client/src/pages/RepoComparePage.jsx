import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import RepoLayout from '../components/RepoLayout';
import { getCachedAnalysis } from '../utils/apiCache';
import { computeTimeMachineStats } from '../utils/metrics';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

const calculateRepoMetrics = (data) => {
  if (!data || data.length === 0) return null;
  const enrichedData = data.map((c) => computeTimeMachineStats(c, 0));
  
  const totalCommits = enrichedData.reduce((s, c) => s + c.total_commits, 0);
  const prsOpened = enrichedData.reduce((s, c) => s + c.prs_opened, 0);
  const prsMerged = enrichedData.reduce((s, c) => s + c.prs_merged, 0);
  const prSuccessRate = prsOpened > 0 ? Math.round((prsMerged / prsOpened) * 100) : 0;
  
  const avgVelocity = Math.round(enrichedData.reduce((s, c) => s + c.velocity_score, 0) / enrichedData.length);
  
  const newC = enrichedData.filter(c => c.total_commits <= 5);
  const mergeSupport = newC.length === 0 ? 70 : Math.round(newC.reduce((s, c) => s + (c.prs_opened === 0 ? 60 : (c.prs_merged / c.prs_opened) * 100), 0) / newC.length);
  const streakBoost = Math.round(enrichedData.reduce((s, c) => s + c.streak_score, 0) / enrichedData.length);
  const friendlinessScore = clamp(Math.round(mergeSupport * 0.65 + streakBoost * 0.35), 0, 100);

  return {
    totalCommits,
    prsOpened,
    prsMerged,
    prSuccessRate,
    avgVelocity,
    friendlinessScore,
    contributorCount: enrichedData.length
  };
};

const MetricRow = ({ label, val1, val2, invertGood = false, suffix = '' }) => {
  const v1 = Number(val1);
  const v2 = Number(val2);
  let color1 = 'var(--gs-text)';
  let color2 = 'var(--gs-text)';
  
  if (v1 > v2) {
      color1 = invertGood ? 'var(--gs-amber)' : 'var(--gs-green)';
      color2 = 'var(--gs-text-2)';
  } else if (v2 > v1) {
      color2 = invertGood ? 'var(--gs-amber)' : 'var(--gs-green)';
      color1 = 'var(--gs-text-2)';
  }

  return (
    <div className="flex items-center justify-between py-4 border-b hover:bg-[var(--gs-surface)] transition-colors" style={{ borderColor: 'var(--gs-border)' }}>
      <div className="w-1/3 text-center font-mono-gs text-2xl font-black" style={{ color: color1 }}>{val1}{suffix}</div>
      <div className="w-1/3 text-center font-mono-gs text-[10px] uppercase tracking-widest text-[#7d8590]">{label}</div>
      <div className="w-1/3 text-center font-mono-gs text-2xl font-black" style={{ color: color2 }}>{val2}{suffix}</div>
    </div>
  );
};

const RepoComparePage = () => {
  const { owner, repo } = useParams();
  
  // Left side (current repo)
  const [baseData, setBaseData] = useState(null);
  const [baseLoading, setBaseLoading] = useState(true);
  
  // Right side (comparison repo)
  const [compareQuery, setCompareQuery] = useState('');
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');
  const [compareTarget, setCompareTarget] = useState(null);
  
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const dropdownRef = useRef(null);

  // Load Base
  useEffect(() => {
    getCachedAnalysis(owner, repo, `${API_BASE_URL}/api/repo/${owner}/${repo}/analyze`)
      .then(r => setBaseData(calculateRepoMetrics(r.data)))
      .finally(() => setBaseLoading(false));
  }, [owner, repo]);

  // Handle Search Debounce
  useEffect(() => {
    if (!compareQuery || compareQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setIsSearching(true);
      axios.get(`${API_BASE_URL}/api/search-repos`, { params: { q: compareQuery } })
        .then(res => setSearchResults(res.data || []))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [compareQuery]);

  // Hide dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectRepo = async (selected) => {
    setSearchResults([]);
    setCompareQuery('');
    setCompareTarget(selected.full_name);
    setCompareLoading(true);
    setCompareError('');
    setCompareData(null);
    
    const [targetOwner, targetRepo] = selected.full_name.split('/');
    
    try {
      const r = await getCachedAnalysis(targetOwner, targetRepo, `${API_BASE_URL}/api/repo/${targetOwner}/${targetRepo}/analyze`);
      setCompareData(calculateRepoMetrics(r.data));
    } catch (err) {
      setCompareError('Failed to analyze repository. It might be too large or private.');
    } finally {
      setCompareLoading(false);
    }
  };

  return (
    <RepoLayout>
      <div className="flex items-center gap-2 mb-2">
         <span className="font-mono-gs text-sm" style={{ color: 'var(--gs-text-muted)' }}>System / Repository / Compare</span>
      </div>
      <div className="flex items-baseline gap-4 mb-10">
         <h1 className="text-4xl md:text-5xl font-black tracking-tighter" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>
            Compare Fit
         </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-stretch relative">
        {/* Left Side: Current Repo */}
        <div className="flex-1 w-full rounded-xl p-6" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
          <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--gs-text)' }}>{repo}</h2>
          <p className="font-mono-gs text-[10px] text-[var(--gs-text-2)] uppercase tracking-widest mb-6">Current Focus</p>
          
          {baseLoading ? (
            <div className="space-y-4">
              <div className="skeleton h-16 w-full rounded" />
              <div className="skeleton h-16 w-full rounded" />
              <div className="skeleton h-16 w-full rounded" />
            </div>
          ) : baseData ? (
             <div className="flex flex-col items-center justify-center p-6 border-dashed border rounded-xl mb-4" style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}>
                 <p className="font-mono-gs text-[10px] text-[var(--gs-purple)] uppercase tracking-widest font-bold mb-2">Newbie Friendliness</p>
                 <p className="text-5xl font-black tracking-tighter" style={{ color: 'var(--gs-text)', fontFamily: "'JetBrains Mono', monospace" }}>{baseData.friendlinessScore}%</p>
             </div>
          ) : null}
        </div>

        {/* Right Side: Search / Compare Repo */}
        <div className="flex-1 w-full rounded-xl p-6 relative" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
          {!compareTarget ? (
             <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--gs-text-2)' }}>Select Repository</h2>
          ) : (
             <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--gs-text)' }}>{compareTarget.split('/')[1]}</h2>
          )}
          
          <div className="relative mb-6" ref={dropdownRef}>
            <input 
              type="text" 
              placeholder="Search opponent repos (e.g., react, django)..." 
              value={compareQuery}
              onChange={e => setCompareQuery(e.target.value)}
              className="w-full px-4 py-3 rounded-lg outline-none font-mono-gs text-sm"
              style={{ background: 'var(--gs-surface-high)', border: '1px solid var(--gs-border)', color: 'var(--gs-text)' }}
            />
            
            {searchResults.length > 0 && (
              <div className="absolute top-[110%] left-0 w-full rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
                <ul className="max-h-64 overflow-y-auto custom-scrollbar">
                  {searchResults.map(res => (
                    <li key={res.full_name}>
                      <button onClick={() => handleSelectRepo(res)} className="w-full text-left px-4 py-3 hover:bg-[var(--gs-surface-high)] border-b flex items-center justify-between" style={{ borderColor: 'var(--gs-border)' }}>
                        <span className="font-bold text-sm tracking-tight">{res.full_name}</span>
                        <span className="font-mono-gs text-[10px] text-[var(--gs-green)]">⭐ {res.stargazers_count}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {isSearching && (
               <div className="absolute right-4 top-3 h-4 w-4 rounded-full border-2 border-[var(--gs-text-muted)] border-t-transparent spin" />
            )}
          </div>
          
          {compareLoading && (
            <div className="p-10 text-center animate-pulse">
               <div className="h-8 w-8 mx-auto rounded-full border-2 border-[var(--gs-green)] border-t-transparent spin mb-4" />
               <p className="font-mono-gs text-sm text-[var(--gs-text-2)] uppercase">Cloning and Analyzing Network...</p>
            </div>
          )}
          
          {compareError && (
            <div className="p-4 rounded border" style={{ background: 'rgba(248,81,73,0.06)', borderColor: 'rgba(248,81,73,0.28)', color: 'var(--gs-red)' }}>
               {compareError}
            </div>
          )}

          {!compareLoading && compareData && (
             <div className="flex flex-col items-center justify-center p-6 border-dashed border rounded-xl" style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}>
                 <p className="font-mono-gs text-[10px] text-[var(--gs-purple)] uppercase tracking-widest font-bold mb-2">Newbie Friendliness</p>
                 <p className="text-5xl font-black tracking-tighter" style={{ color: 'var(--gs-text)', fontFamily: "'JetBrains Mono', monospace" }}>{compareData.friendlinessScore}%</p>
             </div>
          )}
          
          {!compareTarget && !compareLoading && (
             <div className="p-10 text-center border-dashed border rounded-xl" style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-surface)' }}>
                <p className="font-mono-gs text-[10px] text-[var(--gs-text-muted)] uppercase tracking-widest leading-loose">
                  Search for another project to stack them up.<br/>
                  Compare onboarding friendliness and ecosystem momentum natively.
                </p>
             </div>
          )}
        </div>
        
        {/* Floating VS Badge */}
        {baseData && compareData && (
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-black rounded-full items-center justify-center font-black italic text-[10px] z-10 border shadow-2xl" style={{ borderColor: 'var(--gs-border)', color: 'var(--gs-text-2)' }}>
            VS
          </div>
        )}
      </div>
      
      {/* Metrics Row Section */}
      {baseData && compareData && (
         <div className="mt-8 rounded-xl overflow-hidden" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
            <div className="px-6 py-4 border-b flex justify-between uppercase font-mono-gs text-[10px] tracking-widest text-[#7d8590]" style={{ background: 'var(--gs-surface-high)', borderColor: 'var(--gs-border)' }}>
               <span className="truncate w-1/3 text-center">{repo}</span>
               <span className="truncate w-1/3 text-center">Metric</span>
               <span className="truncate w-1/3 text-center">{compareTarget.split('/')[1]}</span>
            </div>
            
            <div className="p-6">
              <MetricRow label="PR Success Rate" val1={baseData.prSuccessRate} val2={compareData.prSuccessRate} suffix="%" />
              <MetricRow label="Core Contributors" val1={baseData.contributorCount} val2={compareData.contributorCount} />
              <MetricRow label="Avg Velocity" val1={baseData.avgVelocity} val2={compareData.avgVelocity} suffix="%" />
              <MetricRow label="Total Commits" val1={baseData.totalCommits} val2={compareData.totalCommits} />
            </div>
         </div>
      )}
    </RepoLayout>
  );
};

export default RepoComparePage;
