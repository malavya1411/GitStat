import React from 'react';
import { Activity, Box, Wrench, Key, FileText, CheckCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

function Badge({ item, delay = 0, isVisible }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Fix visibility in light mode for light colors
  let textColor = isVisible ? item.color : 'transparent';
  let bgColor = isVisible ? item.bg : 'transparent';
  let borderColor = `${item.color}${isVisible ? '99' : '00'}`;

  if (isLight && isVisible) {
    // If the text is white, use the primary text color
    if (item.color.toLowerCase() === '#ffffff') {
      textColor = 'var(--gs-text)';
      bgColor = 'var(--gs-surface-high)';
      borderColor = 'var(--gs-border)';
    }
    // If the text is bright yellow (JavaScript), use a darker amber version
    else if (item.color.toLowerCase() === '#f7df1e') {
      textColor = 'var(--gs-amber)'; // Defined as #78350f in light theme
      bgColor = 'rgba(120, 53, 15, 0.1)';
      borderColor = 'rgba(120, 53, 15, 0.3)';
    }
  }

  return (
    <div
      className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all duration-500 whitespace-nowrap hover:scale-105 cursor-default select-none"
      style={{
        background: bgColor,
        color: textColor,
        border: `1.5px solid ${borderColor}`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
        transitionDelay: `${delay}ms`,
        boxShadow: `0 0 12px ${item.color}10`,
      }}
    >
      <span style={{ fontFamily: item.icon?.length <= 2 ? "'JetBrains Mono', monospace" : undefined, fontSize: item.icon?.length > 2 ? '13px' : undefined }}>
        {item.icon}
      </span>
      <span style={{ fontFamily: "'Geist Sans', sans-serif" }}>{item.name}</span>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div className="text-[9px] uppercase tracking-[0.2em] font-bold px-1 mt-5 mb-2 first:mt-0 font-mono-gs" style={{ color: 'var(--gs-text-muted)' }}>
      {label}
    </div>
  );
}

export default function TechStackBadges({ techStack, isVisible }) {
  if (!techStack) return null;

  const allBadges = [
    ...techStack.languages.map(b => ({ ...b, group: 'Language' })),
    ...techStack.frameworks.map(b => ({ ...b, group: 'Framework' })),
    techStack.packageManager ? { ...techStack.packageManager, group: 'Package Manager' } : null,
    ...techStack.tools.map(b => ({ ...b, group: 'Tool' })),
  ].filter(Boolean);

  // Group by category
  const grouped = {};
  allBadges.forEach(b => {
    if (!grouped[b.group]) grouped[b.group] = [];
    grouped[b.group].push(b);
  });

  let delay = 0;

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
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(188,140,255,0.1)', border: '1px solid rgba(188,140,255,0.2)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bc8cff" strokeWidth="2">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>
        <div>
          <h3 className="text-[14px] font-bold" style={{ fontFamily: "'Geist Sans', sans-serif", color: 'var(--gs-text)' }}>
            Tech Stack
          </h3>
          <p className="text-[11px] mt-0.5 font-mono-gs" style={{ color: 'var(--gs-text-muted)' }}>
            Detected from repository contents
          </p>
        </div>
      </div>

      {/* Grouped badges */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-[13px] font-mono-gs" style={{ color: 'var(--gs-text-muted)' }}>
          No tech stack detected
        </div>
      ) : (
        <div>
          {Object.entries(grouped).map(([group, badges]) => (
            <div key={group}>
              <SectionLabel label={group} />
              <div className="flex flex-wrap gap-2">
                {badges.map((badge, i) => {
                  const d = delay;
                  delay += 60;
                  return <Badge key={badge.name} item={badge} delay={d} isVisible={isVisible} />;
                })}
              </div>
            </div>
          ))}
        </div>
      )}



      {/* Extra flags */}
      <div className="flex flex-wrap gap-4 mt-5 pt-4" style={{ borderTop: '1px solid var(--gs-border)' }}>
        {techStack.hasTests && <Flag color="#2ea043" label="Testing" icon={<CheckCircle size={12} />} />}
        {techStack.hasCI && <Flag color="#2088ff" label="CI/CD" icon={<Activity size={12} />} />}
        {techStack.hasDocker && <Flag color="#2496ed" label="Docker" icon={<Box size={12} />} />}
        {techStack.hasIaC && <Flag color="#844fba" label="IaC" icon={<Wrench size={12} />} />}
        {techStack.hasEnvExample && <Flag color="#d29922" label=".env.example" icon={<Key size={12} />} />}
        {techStack.hasContributing && <Flag color="#58a6ff" label="CONTRIBUTING.md" icon={<FileText size={12} />} />}
      </div>
    </div>
  );
}

function Flag({ color, label, icon }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-mono-gs"
      style={{ color }}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
