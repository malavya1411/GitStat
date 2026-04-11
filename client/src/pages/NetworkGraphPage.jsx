import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { getAllAnalyzedData } from '../utils/apiCache';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const NetworkGraphPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  const [analyzedData, setAnalyzedData] = useState({});
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [dim, setDim] = useState({ w: window.innerWidth, h: window.innerHeight - 64 });

  useEffect(() => {
    const fetchAll = async () => {
      const data = await getAllAnalyzedData();
      setAnalyzedData(data);
      setLoading(false);
    };
    fetchAll();
    
    const handleResize = () => {
      if (containerRef.current) {
        setDim({ w: containerRef.current.clientWidth, h: window.innerHeight - 64 });
      }
    };
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 100);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const graphData = useMemo(() => {
    const nodes = [];
    const links = [];
    const repos = Object.keys(analyzedData);
    
    if (repos.length === 0) return { nodes, links };
    
    // Map of contributor login -> combined health score and repos
    const contributorGraph = {};
    
    repos.forEach(repoName => {
      const contributors = analyzedData[repoName];
      contributors.forEach(c => {
        if (!contributorGraph[c.login]) {
          contributorGraph[c.login] = {
            id: c.login,
            type: 'contributor',
            val: 0,
            repos: new Set(),
            avatar: c.avatar_url,
            health_score: 0,
          };
        }
        contributorGraph[c.login].repos.add(repoName);
        contributorGraph[c.login].health_score += c.health_score;
      });
    });

    Object.values(contributorGraph).forEach(cNode => {
      // average their health
      cNode.health_score = Math.round(cNode.health_score / Math.max(1, cNode.repos.size));
      // val size based on health score + multi-repo bonus
      cNode.val = Math.max(2, (cNode.health_score / 20) * (cNode.repos.size * 1.5));
      nodes.push(cNode);
      
      cNode.repos.forEach(r => {
        links.push({
          source: cNode.id,
          target: r,
          value: 1
        });
      });
    });
    
    repos.forEach(repoName => {
      // add repo node
      nodes.push({
        id: repoName,
        type: 'repo',
        val: 15,
        color: 'var(--gs-green)'
      });
    });
    
    return { nodes, links };
  }, [analyzedData]);

  // Find highly connected contributors
  const loadBearing = useMemo(() => {
    return graphData.nodes
      .filter(n => n.type === 'contributor' && n.repos.size > 1)
      .sort((a,b) => b.repos.size - a.repos.size);
  }, [graphData]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--gs-bg)', color: 'var(--gs-text)' }}>
      <div className="noise-overlay" aria-hidden="true" />
      <header className="gs-navbar sticky top-0 z-50 w-full border-b" style={{ borderColor: 'var(--gs-border)' }}>
        <div className="flex items-center justify-between px-6 h-16 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate('/repos')} className="text-xl font-black tracking-tighter select-none transition-opacity hover:opacity-80" style={{ fontFamily: "'Geist Sans', sans-serif" }}>GitStat</button>
            <span className="font-mono-gs text-[10px] uppercase tracking-widest px-2 py-1 rounded" style={{ background: 'var(--gs-surface)', color: 'var(--gs-text-muted)' }}>Cross-Repo Radar</span>
          </div>
        </div>
      </header>

      <main className="relative flex-1 flex flex-col md:flex-row w-full max-w-[1600px] mx-auto overflow-hidden h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside className="w-full md:w-80 border-r flex flex-col z-20 shrink-0" style={{ borderColor: 'var(--gs-border)', background: 'var(--gs-bg)' }}>
          <div className="p-6 border-b" style={{ borderColor: 'var(--gs-border)' }}>
            <h2 className="text-2xl font-bold font-sans mb-2" style={{ fontFamily: "'Geist Sans', sans-serif" }}>Network Graph</h2>
            <p className="font-mono-gs text-[10px] uppercase tracking-widest leading-relaxed text-[var(--gs-text-2)]">
              Visualizes connections spanning {Object.keys(analyzedData).length} analyzed repositories. Larger nodes indicate higher cross-project health.
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {loading ? (
              <p className="font-mono-gs text-xs text-center p-4">Loading simulation...</p>
            ) : Object.keys(analyzedData).length === 0 ? (
              <div className="rounded-xl p-5 border-dashed border text-center" style={{ borderColor: 'var(--gs-border)' }}>
                <p className="font-mono-gs text-sm text-[var(--gs-text-2)] mb-2">No Repositories Analyzed</p>
                <p className="font-mono-gs text-[10px] text-[var(--gs-text-muted)]">Go back to your repositories list and click "Analyze" on a few projects to generate a graph.</p>
                <button onClick={() => navigate('/repos')} className="mt-4 px-4 py-2 rounded font-bold text-[10px] uppercase tracking-widest text-black bg-[var(--gs-green)] hover:opacity-80 transition-opacity">Go analyzing</button>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest font-mono-gs mb-4 text-[var(--gs-purple)]">Load-Bearing Contributors</h3>
                {loadBearing.length === 0 ? (
                   <p className="font-mono-gs text-[10px] text-[var(--gs-text-2)]">No contributors span multiple repositories across your current session.</p>
                ) : (
                   <div className="space-y-3">
                     {loadBearing.map(n => (
                       <div key={n.id} className="p-3 rounded-xl border border-[var(--gs-surface-high)] bg-[var(--gs-surface)] flex items-center gap-3">
                         <img src={n.avatar} className="w-8 h-8 rounded-full" alt={n.id} />
                         <div className="flex-1 min-w-0">
                           <a href={`https://github.com/${n.id}`} target="_blank" rel="noreferrer" className="block text-sm font-bold font-mono-gs hover:underline truncate" style={{ color: 'var(--gs-text)' }}>@{n.id}</a>
                           <span className="text-[10px] font-mono-gs text-[var(--gs-text-2)] block truncate">In {n.repos.size} Repos (Health: {n.health_score})</span>
                         </div>
                       </div>
                     ))}
                   </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Canvas area */}
        <div className="flex-1 relative bg-black/40" ref={containerRef}>
            {graphData.nodes.length > 0 && (
              <ForceGraph2D
                width={dim.w}
                height={dim.h}
                graphData={graphData}
                nodeAutoColorBy="type"
                nodeRelSize={4}
                autoPauseRedraw={false}
                linkColor={() => theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const label = node.id;
                  const size = Math.max(1.5, node.val);
                  
                  if (node.type === 'repo') {
                     ctx.beginPath();
                     ctx.arc(node.x, node.y, size * 1.5, 0, 2 * Math.PI, false);
                     ctx.fillStyle = node.color;
                     ctx.fill();
                  } else {
                     ctx.beginPath();
                     ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                     
                     // Color by health
                     let color = '#bc8cff'; // purple default
                     if (node.health_score <= 40) color = '#f85149';
                     else if (node.health_score <= 65) color = '#d29922';
                     else if (node.health_score <= 85) color = '#2ea043';
                     
                     ctx.fillStyle = color;
                     ctx.fill();
                  }
                  
                  // Text label for nodes if sufficiently zoomed
                  if (globalScale >= 2.5) {
                    const fontSize = 12/globalScale;
                    ctx.font = `${fontSize}px JetBrains Mono`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)';
                    ctx.fillText(label, node.x, node.y + size + fontSize + 1);
                  }
                }}
              />
            )}
            
            {/* Absolute positioning of instructions */}
            <div className="absolute bottom-4 left-4 p-4 rounded-xl border border-[var(--gs-surface-high)] bg-[var(--gs-card)] pointer-events-none opacity-80 z-20">
              <span className="block font-mono-gs text-[9px] uppercase tracking-widest text-[var(--gs-text-2)]">Drag to pan · Scroll to zoom</span>
              <span className="block font-mono-gs text-[9px] uppercase tracking-widest text-[var(--gs-text-2)] mt-1">Repo nodes (Green) · Contributor nodes (Health Match)</span>
            </div>
        </div>
      </main>
    </div>
  );
};

export default NetworkGraphPage;
