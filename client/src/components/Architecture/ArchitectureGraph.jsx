import React, { useState, useCallback } from 'react';
import { 
  Folder, 
  File, 
  FileCode, 
  ChevronRight, 
  Code, 
  Zap, 
  Layout, 
  Database, 
  Wrench, 
  Shield, 
  Settings, 
  FileText, 
  Image,
  Terminal,
  Coffee,
  Gem,
  Server,
  Key,
  EyeOff,
  Box,
  Package
} from 'lucide-react';
import { categorizeDirectories, getFileIcon } from '../../utils/buildTreeStructure';

const LucideIconMap = {
  Folder, File, FileCode, Code, Zap, Layout, Database, Wrench, Shield, Settings, FileText, Image, Terminal, Coffee, Gem, Server, Key, EyeOff, Box, Package
};

function DynamicIcon({ name, ...props }) {
  const Icon = LucideIconMap[name] || File;
  return <Icon {...props} />;
}

/* ─── Small repo: Collapsible tree view ─── */
function TreeNode({ node, depth = 0, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen || depth < 2);
  const isDir = node.type === 'tree';
  const iconInfo = isDir ? null : getFileIcon(node.extension);
  const hasChildren = node.children && node.children.length > 0;

  const indent = depth * 16;

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md py-1 px-2 cursor-default group/node transition-colors hover:bg-white/[0.03]"
        style={{ paddingLeft: `${indent + 8}px` }}
        onClick={() => isDir && hasChildren && setOpen(o => !o)}
      >
        {/* Expand arrow */}
        {isDir && hasChildren ? (
          <ChevronRight 
            size={12}
            className="transition-transform shrink-0"
            style={{ color: '#484f58', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
        ) : (
          <span className="w-[12px] shrink-0" />
        )}

        {/* Icon */}
        <span className="shrink-0" style={{ color: iconInfo?.color || 'var(--gs-text-muted)' }}>
          {isDir ? (
            open ? <Folder size={14} fill="currentColor" fillOpacity={0.1} /> : <Folder size={14} />
          ) : (
            <DynamicIcon name={iconInfo?.icon} size={14} />
          )}
        </span>

        {/* Name */}
        <span
          className="text-[12px] truncate font-mono-gs"
          style={{
            color: isDir ? 'var(--gs-text)' : 'var(--gs-text-2)',
            fontWeight: isDir ? 600 : 400,
          }}
        >
          {node.name}
        </span>

        {/* File count badge for dirs */}
        {isDir && hasChildren && (
          <span className="text-[10px] rounded-full px-1.5 py-0.5 ml-auto font-mono-gs shrink-0"
            style={{ background: 'var(--gs-surface)', color: 'var(--gs-text-muted)' }}>
            {node.children.length}
          </span>
        )}
        {/* File size */}
        {!isDir && node.size > 0 && (
          <span className="text-[10px] ml-auto shrink-0 font-mono-gs" style={{ color: 'var(--gs-text-muted)' }}>
            {node.size > 1024 ? `${(node.size / 1024).toFixed(1)}kb` : `${node.size}b`}
          </span>
        )}
      </div>

      {/* Children */}
      {open && hasChildren && (
        <div
          style={{
            borderLeft: depth > 0 ? '1px solid var(--gs-border)' : 'none',
            marginLeft: `${indent + 15}px`,
            overflow: 'hidden',
          }}
        >
          {node.children
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .filter(c => !c.name.startsWith('.') || depth === 0)
            .map(child => (
              <TreeNode key={child.path} node={child} depth={depth + 1} />
            ))
          }
        </div>
      )}
    </div>
  );
}

function SmallTreeView({ treeRoot }) {
  return (
    <div className="rounded-xl p-4 overflow-auto max-h-[600px] custom-scrollbar"
      style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)' }}>
      <div className="text-[10px] uppercase font-bold font-mono-gs tracking-widest mb-3 px-2" style={{ color: 'var(--gs-text-muted)' }}>
        File Explorer
      </div>
      {treeRoot.children.map(child => (
        <TreeNode key={child.path} node={child} depth={0} defaultOpen />
      ))}
    </div>
  );
}

/* ─── Medium repo: Layered node graph ─── */
function MediumGraphView({ treeRoot, techStack }) {
  const [expanded, setExpanded] = useState(new Set());
  const categorized = categorizeDirectories(treeRoot);

  const toggle = (path) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(path) ? n.delete(path) : n.add(path);
    return n;
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {categorized.map(node => (
          <div key={node.path}>
            <button
              onClick={() => toggle(node.path)}
              className="w-full rounded-xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] duration-200 group/node"
              style={{
                background: node.style.bg,
                border: `1px solid ${expanded.has(node.path) ? node.style.color : node.style.border}`,
                boxShadow: expanded.has(node.path) ? `0 0 20px ${node.style.color}20` : 'none',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: node.style.color }}>
                  {node.type === 'tree' ? <Folder size={18} /> : <File size={18} />}
                </span>
                <span className="text-[12px] font-bold font-mono-gs" style={{ color: node.style.color }}>
                  {node.name}/
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-widest font-mono-gs" style={{ color: node.style.color, opacity: 0.7 }}>
                {node.style.label}
              </div>
              <div className="text-[11px] mt-1 font-mono-gs" style={{ color: '#7d8590' }}>
                {node.children?.length || 0} items
              </div>
            </button>

            {/* Expanded children */}
            {expanded.has(node.path) && node.children?.length > 0 && (
              <div className="mt-2 rounded-xl overflow-hidden" style={{ background: 'var(--gs-surface)', border: '1px solid var(--gs-border)' }}>
                {node.children.slice(0, 20).map(child => {
                  const ico = getFileIcon(child.extension);
                  return (
                    <div key={child.path} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/[0.03]">
                      <span className="shrink-0" style={{ color: ico?.color }}>
                        <DynamicIcon name={ico?.icon} size={12} />
                      </span>
                      <span className="text-[11px] truncate font-mono-gs" style={{ color: '#7d8590' }}>{child.name}</span>
                    </div>
                  );
                })}
                {node.children.length > 20 && (
                  <div className="px-3 py-2 text-[11px] font-mono-gs" style={{ color: 'var(--gs-text-muted)' }}>
                    +{node.children.length - 20} more files...
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Large repo: High-level Architecture cluster map ─── */
const CLUSTER_PATTERN = [
  { key: 'source', dirs: ['src', 'source', 'lib', 'app', 'core', 'features'], icon: 'Code', label: 'Application Source' },
  { key: 'api', dirs: ['api', 'routes', 'controllers', 'endpoints', 'server'], icon: 'Zap', label: 'API / Server' },
  { key: 'ui', dirs: ['components', 'pages', 'views', 'layouts', 'ui'], icon: 'Layout', label: 'UI Components' },
  { key: 'data', dirs: ['models', 'schemas', 'db', 'database', 'migrations', 'prisma'], icon: 'Database', label: 'Data / Models' },
  { key: 'utils', dirs: ['utils', 'helpers', 'hooks', 'services', 'lib'], icon: 'Wrench', label: 'Utilities' },
  { key: 'tests', dirs: ['tests', 'test', '__tests__', 'spec', 'e2e', 'cypress', 'jest'], icon: 'Shield', label: 'Testing' },
  { key: 'config', dirs: ['config', 'scripts', '.github', '.husky', 'ci', 'deploy'], icon: 'Settings', label: 'Config / CI' },
  { key: 'docs', dirs: ['docs', 'doc', 'documentation', 'wiki'], icon: 'FileText', label: 'Documentation' },
  { key: 'assets', dirs: ['public', 'assets', 'static', 'images', 'img'], icon: 'Image', label: 'Static Assets' },
];

const CLUSTER_COLORS = {
  source: '#bc8cff',
  api: '#58a6ff',
  ui: '#61dafb',
  data: '#2ea043',
  utils: '#f7df1e',
  tests: '#52d053',
  config: '#d29922',
  docs: '#60a5fa',
  assets: '#f78166',
  other: '#7d8590',
};

function LargeArchMap({ treeRoot, techStack }) {
  const [selected, setSelected] = useState(null);
  const topLevel = treeRoot.children.map(c => c.name.toLowerCase());

  const clusters = CLUSTER_PATTERN.map(cluster => {
    const matches = cluster.dirs.filter(d => topLevel.includes(d));
    if (matches.length === 0) return null;
    return {
      ...cluster,
      matched: matches,
      color: CLUSTER_COLORS[cluster.key],
      nodes: matches.flatMap(d =>
        treeRoot.children.find(c => c.name.toLowerCase() === d)?.children?.slice(0, 6) || []
      ),
    };
  }).filter(Boolean);

  // Unclustered dirs
  const clusteredDirs = clusters.flatMap(c => c.matched);
  const others = treeRoot.children
    .filter(c => !clusteredDirs.includes(c.name.toLowerCase()))
    .filter(c => !c.name.startsWith('.') || c.name === '.github');

  if (others.length > 0) {
    clusters.push({
      key: 'other',
      icon: 'Package',
      label: 'Other',
      color: CLUSTER_COLORS.other,
      matched: others.map(o => o.name),
      nodes: others.flatMap(o => o.children?.slice(0, 4) || []),
    });
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {clusters.map(cluster => (
          <button
            key={cluster.key}
            onClick={() => setSelected(prev => prev?.key === cluster.key ? null : cluster)}
            className="rounded-2xl p-5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: `${cluster.color}10`,
              border: `1.5px solid ${selected?.key === cluster.key ? cluster.color : cluster.color + '30'}`,
              boxShadow: selected?.key === cluster.key ? `0 0 30px ${cluster.color}20` : 'none',
            }}
          >
            <div className="mb-3" style={{ color: cluster.color }}>
              <DynamicIcon name={cluster.icon} size={32} strokeWidth={1.5} />
            </div>
            <div className="text-[13px] font-bold mb-1" style={{ color: cluster.color, fontFamily: "'Geist Sans', sans-serif" }}>
              {cluster.label}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {cluster.matched.map(d => (
                <span key={d} className="text-[10px] rounded-md px-1.5 py-0.5 font-mono-gs"
                  style={{ background: `${cluster.color}15`, color: cluster.color }}>
                  /{d}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Drill-down panel */}
      {selected && (
        <div className="mt-4 rounded-xl p-5 transition-all duration-300"
          style={{ background: `${selected.color}08`, border: `1px solid ${selected.color}30` }}>
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: selected.color }}>
              <DynamicIcon name={selected.icon} size={20} />
            </span>
            <span className="font-bold text-[14px]" style={{ color: selected.color, fontFamily: "'Geist Sans', sans-serif" }}>
              {selected.label}
            </span>
            <span className="font-mono-gs text-[11px] ml-auto" style={{ color: 'var(--gs-text-muted)' }}>
              Click any cluster above to explore
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {selected.nodes.slice(0, 24).map(n => {
              const ico = getFileIcon(n.extension);
              return (
                <div key={n.path} className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="shrink-0" style={{ color: ico?.color }}>
                    {n.type === 'tree' ? <Folder size={14} /> : <DynamicIcon name={ico?.icon} size={14} />}
                  </span>
                  <span className="text-[11px] font-mono-gs truncate" style={{ color: 'var(--gs-text-2)' }}>{n.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─── */
export default function ArchitectureGraph({ treeRoot, complexity, totalFiles, techStack, isVisible }) {
  if (!treeRoot) return null;

  return (
    <div
      className="rounded-2xl p-6 transition-all duration-500"
      style={{
        background: 'var(--gs-card)',
        border: '1px solid var(--gs-border)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(88,166,255,0.1)', border: '1px solid rgba(88,166,255,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#58a6ff" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </div>
          <div>
            <h3 className="text-[14px] font-bold" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>
              Repository Architecture
            </h3>
            <p className="text-[11px] mt-0.5 font-mono-gs" style={{ color: 'var(--gs-text-muted)' }}>
              {totalFiles.toLocaleString()} files · {complexity} repo
              {complexity === 'small' ? ' · Full tree view' : complexity === 'medium' ? ' · Directory graph' : ' · Architecture map'}
            </p>
          </div>
        </div>

        {/* Mode badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-2">
            {[
              { label: 'Single owner', color: '#f85149' },
              { label: '2 contributors', color: '#d29922' },
              { label: 'Well distributed', color: '#2ea043' },
            ].map(b => (
              <span key={b.label} className="flex items-center gap-1.5 text-[10px] font-mono-gs px-2 py-1 rounded-full"
                style={{ background: 'var(--gs-surface)', color: 'var(--gs-text-muted)', border: '1px solid var(--gs-border)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: b.color }} />
                {b.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* The view */}
      {complexity === 'small' && <SmallTreeView treeRoot={treeRoot} />}
      {complexity === 'medium' && <MediumGraphView treeRoot={treeRoot} techStack={techStack} />}
      {complexity === 'large' && <LargeArchMap treeRoot={treeRoot} techStack={techStack} />}
    </div>
  );
}
