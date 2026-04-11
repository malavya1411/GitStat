import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Flame, Sparkles, AlertTriangle, RotateCcw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const LargeRepoBanner = ({ sampledCount, totalEstimate }) => (
  <div className="flex items-start gap-2 px-4 py-2.5 rounded-lg mb-4 text-[12px] font-mono-gs"
    style={{ background: 'rgba(210,153,34,0.08)', border: '1px solid rgba(210,153,34,0.25)', color: 'var(--gs-amber)' }}>
    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
    <span>
      Large repository detected — showing analysis for the <strong>{sampledCount}</strong> most significant files.
      Full analysis available for repositories under 500 files.
    </span>
  </div>
);

const TimeoutState = ({ onRetry }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
    <AlertTriangle size={28} style={{ color: 'var(--gs-amber)' }} />
    <p className="text-[13px] font-mono-gs text-center" style={{ color: 'var(--gs-text-2)' }}>
      GitHub API took too long. Try a smaller repository.
    </p>
    <button onClick={onRetry}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all hover:opacity-80 active:scale-95"
      style={{ background: 'rgba(210,153,34,0.1)', border: '1px solid rgba(210,153,34,0.3)', color: 'var(--gs-amber)' }}>
      <RotateCcw size={13} /> Retry
    </button>
  </div>
);

export default function DeepInsights({ owner, repo }) {
  const [busFactorData, setBusFactorData] = useState(null);
  const [busFactorLoading, setBusFactorLoading] = useState(true);
  const [busFactorTimeout, setBusFactorTimeout] = useState(false);
  const [readmeScore, setReadmeScore] = useState(null);
  const [readmeLoading, setReadmeLoading] = useState(true);
  const [readmeTimeout, setReadmeTimeout] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setBusFactorLoading(true);
    setBusFactorTimeout(false);
    setBusFactorData(null);
    const fetchBusFactor = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/repo/${owner}/${repo}/bus-factor`, { withCredentials: true });
        if (res.data?.error === 'timeout') { setBusFactorTimeout(true); }
        else { setBusFactorData(res.data); }
      } catch (err) {
        if (err.response?.status === 408 || err.response?.data?.error === 'timeout') {
          setBusFactorTimeout(true);
        }
      } finally { setBusFactorLoading(false); }
    };
    
    setReadmeLoading(true);
    setReadmeTimeout(false);
    setReadmeScore(null);
    const fetchReadme = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/repo/${owner}/${repo}/readme-score`, { withCredentials: true });
        if (res.data?.error === 'timeout') { setReadmeTimeout(true); }
        else { setReadmeScore(res.data); }
      } catch (err) {
        if (err.response?.status === 408) setReadmeTimeout(true);
      } finally { setReadmeLoading(false); }
    };

    fetchBusFactor();
    fetchReadme();
  }, [owner, repo, retryKey]);

  return (
    <div className="grid grid-cols-1 gap-6 mt-12 mb-12">
      {/* Bus Factor Heatmap */}
      <div className="rounded-xl p-8 relative flex flex-col transition-all duration-300" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
        <div className="flex items-center gap-3 mb-4">
           <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20">
             <Flame size={16} />
           </div>
           <h3 className="text-[14px] font-bold tracking-wider font-mono-gs uppercase text-[var(--gs-text)]">Bus Factor Heatmap</h3>
        </div>
        <p className="text-[13px] text-[var(--gs-text-2)] mb-4">
          <strong style={{ color: 'var(--gs-text)' }}>What is this?</strong> The "Bus Factor" measures the concentration of knowledge in your team. A high risk means critical parts of the codebase are understood by only one person. If that person leaves (or gets hit by a bus), the project is at risk.
        </p>
        <p className="text-[12px] text-[var(--gs-text-muted)] mb-6 italic">Each square represents a file. Red = 1 contributor. Green = safely shared.</p>
        
        {busFactorLoading ? (
           <div className="flex-1 flex flex-col gap-3">
             <div className="skeleton h-10 w-32 rounded" />
             <div className="skeleton flex-1 rounded" />
           </div>
        ) : busFactorTimeout ? (
           <TimeoutState onRetry={() => setRetryKey(k => k + 1)} />
        ) : busFactorData ? (
           <div className="flex-1 flex flex-col">
             <div className="flex gap-4 items-end mb-4">
               <div className="text-4xl font-black font-mono-gs" style={{color: busFactorData.bus_factor_score > 70 ? 'var(--gs-green)' : busFactorData.bus_factor_score > 40 ? 'var(--gs-amber)' : 'var(--gs-red)'}}>
                  {busFactorData.bus_factor_score}
               </div>
               <div className="text-[11px] uppercase tracking-widest text-[var(--gs-text-muted)] p-1">Health Score</div>
             </div>
             {busFactorData.truncated && (
               <LargeRepoBanner sampledCount={busFactorData.sampledCount} totalEstimate={busFactorData.sampledCount} />
             )}
             <div className="flex flex-wrap gap-2 custom-scrollbar overflow-y-visible pr-2 max-h-[400px]">
               {busFactorData.heatmap.map((file, i) => (
                 <div key={i} className="group relative w-10 h-10 rounded-md flex items-center justify-center cursor-crosshair transition-transform hover:scale-125 hover:z-50 shadow-sm" 
                      style={{ background: file.risk === 'high' ? 'var(--gs-red)' : file.risk === 'medium' ? 'var(--gs-amber)' : 'var(--gs-green)', opacity: 0.85 }}>
                   <span className="opacity-0 group-hover:opacity-100 absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-[300px] px-4 py-3 bg-[#0a0b06] text-white text-[12px] font-mono-gs rounded-lg border border-white/10 pointer-events-none z-[100] shadow-2xl">
                     <div className="truncate mb-1 opacity-70">{file.path}</div>
                     <div className="font-bold">{file.unique_contributors} contributor(s)</div>
                   </span>
                 </div>
               ))}
             </div>
           </div>
        ) : (
           <div className="flex-1 flex items-center justify-center text-[var(--gs-text-muted)] text-[12px] font-mono-gs">No bus factor data available</div>
        )}
      </div>

      {/* README Scorecard */}
      <div className="rounded-xl p-8 flex flex-col transition-all duration-300" style={{ background: 'var(--gs-card)', border: '1px solid var(--gs-border)' }}>
         <div className="flex items-center gap-3 mb-4">
           <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ background: 'rgba(55,48,163,0.1)', borderColor: 'rgba(55,48,163,0.2)', color: 'var(--gs-purple)' }}>
             <Sparkles size={16} />
           </div>
           <h3 className="text-[14px] font-bold tracking-wider font-mono-gs uppercase text-[var(--gs-text)]">Readme Onboarding AI</h3>
         </div>
         <p className="text-[13px] text-[var(--gs-text-2)] mb-4">
          <strong style={{ color: 'var(--gs-text)' }}>What is this?</strong> We actively evaluate the repository's README file using an LLM. It scores how welcoming and informative the project is for new contributors based on industry-standard onboarding principles.
         </p>
         <p className="text-[12px] text-[var(--gs-text-muted)] mb-6 italic">A top score means contributors can clone, install, and contribute within minutes.</p>
         
         {readmeLoading ? (
            <div className="flex-1 flex flex-col gap-4">
               <div className="skeleton h-8 w-full rounded" />
               <div className="skeleton h-8 w-full rounded" />
               <div className="skeleton h-8 w-full rounded" />
               <div className="skeleton flex-1 mt-4 rounded" />
            </div>
         ) : readmeTimeout ? (
            <TimeoutState onRetry={() => setRetryKey(k => k + 1)} />
         ) : readmeScore ? (
            <div className="flex-1 flex flex-col gap-6">
              <div>
                <ul className="space-y-3">
                  {['setup_guide', 'contribution_guidelines', 'code_of_conduct', 'license', 'contact', 'purpose'].map(cat => {
                    const val = readmeScore[cat] || 0;
                    return (
                    <li key={cat} className="flex justify-between items-center text-[12px] font-mono-gs">
                      <span className="opacity-80 truncate pr-4">{cat.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-3 shrink-0">
                         <div className="w-24 h-1.5 bg-[var(--gs-surface-high)] rounded-full overflow-hidden">
                           <div className="h-full rounded-full" style={{ width: `${(val / 10) * 100}%`, background: val >= 7 ? 'var(--gs-green)' : val >= 4 ? 'var(--gs-amber)' : 'var(--gs-red)' }}></div>
                         </div>
                         <span className="w-5 text-right font-bold text-[var(--gs-text)]">{val}</span>
                      </div>
                    </li>
                  )})}
                </ul>
              </div>
              {readmeScore.suggestions && readmeScore.suggestions.length > 0 && (
                 <div className="p-4 rounded-lg bg-[rgba(248,81,73,0.05)] border border-[rgba(248,81,73,0.15)] mt-auto">
                   <h4 className="font-bold mb-2 font-mono-gs uppercase tracking-widest text-[9px] text-[var(--gs-red)]">Critical Openings</h4>
                   <ul className="list-disc pl-4 space-y-1 text-[12px] text-[var(--gs-text-2)]">
                     {readmeScore.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                   </ul>
                 </div>
              )}
            </div>
         ) : (
            <div className="flex-1 flex items-center justify-center text-[var(--gs-text-muted)] text-[12px] font-mono-gs">Could not analyze README</div>
         )}
      </div>
    </div>
  );
}
