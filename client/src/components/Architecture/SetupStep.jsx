/**
 * SetupStep.jsx
 * Individual animated step card with copy-to-clipboard code block
 */
import React, { useState } from 'react';

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

function CodeBlock({ code, language = 'bash' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {}
  };

  return (
    <div className="relative group/code rounded-xl overflow-hidden mt-3" style={{ background: 'var(--gs-surface-high)', border: '1px solid var(--gs-border)' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(0,0,0,0.1)', borderBottom: '1px solid var(--gs-border)' }}>
        <span className="font-mono-gs text-[10px] uppercase tracking-widest" style={{ color: 'var(--gs-text-muted)' }}>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-mono-gs transition-all active:scale-95"
          style={{
            background: copied ? 'rgba(46,160,67,0.15)' : 'rgba(255,255,255,0.04)',
            color: copied ? '#2ea043' : '#7d8590',
            border: `1px solid ${copied ? 'rgba(46,160,67,0.3)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      {/* Code */}
      <pre className="p-4 m-0 text-[13px] leading-relaxed overflow-x-auto font-mono-gs" style={{ color: 'var(--gs-text)' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EnvVarRow({ varObj }) {
  return (
    <div className="rounded-lg p-3 flex flex-col gap-1" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)' }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono-gs text-[12px] font-bold" style={{ color: 'var(--gs-amber)' }}>{varObj.key}</span>
        {varObj.description.service && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgba(182,187,198,0.08)', color: '#7d8590' }}>
            {varObj.description.service}
          </span>
        )}
        {varObj.description.link && (
          <a href={varObj.description.link} target="_blank" rel="noreferrer"
             className="flex items-center gap-1 text-[10px] underline-offset-2 hover:underline transition-opacity hover:opacity-100 opacity-60"
             style={{ color: '#58a6ff' }}>
            Get key <ExternalLinkIcon />
          </a>
        )}
      </div>
      {varObj.description.desc && (
        <span className="text-[11px]" style={{ color: '#7d8590' }}>{varObj.description.desc}</span>
      )}
    </div>
  );
}

const STEP_COLORS = [
  { num: 'var(--gs-purple)', bg: 'rgba(55,48,163,0.1)', border: 'rgba(55,48,163,0.2)' },
  { num: 'var(--gs-primary)', bg: 'rgba(67,56,202,0.1)', border: 'rgba(67,56,202,0.2)' },
  { num: 'var(--gs-green)', bg: 'rgba(6,95,70,0.1)', border: 'rgba(6,95,70,0.2)' },
  { num: 'var(--gs-amber)', bg: 'rgba(120,53,15,0.1)', border: 'rgba(120,53,15,0.2)' },
  { num: '#e11d48', bg: 'rgba(225,29,72,0.1)', border: 'rgba(225,29,72,0.2)' },
  { num: '#ea580c', bg: 'rgba(234,88,12,0.1)', border: 'rgba(234,88,12,0.2)' },
];

export default function SetupStep({ step, index, isVisible }) {
  const colors = STEP_COLORS[index % STEP_COLORS.length];

  return (
    <div
      className="rounded-2xl p-6 transition-all duration-500"
      style={{
        background: 'var(--gs-card)',
        border: `1px solid ${isVisible ? colors.border : 'var(--gs-border)'}`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
        transitionDelay: `${index * 80}ms`,
      }}
    >
      <div className="flex items-start gap-4">
        {/* Step number badge */}
        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] font-mono-gs shadow-sm"
          style={{ background: colors.bg, color: colors.num, border: `1.5px solid ${colors.border}` }}>
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title + description */}
          <h4 className="font-bold text-[15px] mb-1" style={{ color: 'var(--gs-text)', fontFamily: "'Geist Sans', sans-serif" }}>
            {step.title}
          </h4>
          {step.description && (
            <p className="text-[13px] mb-3 leading-relaxed" style={{ color: 'var(--gs-text-2)' }}>
              {step.description}
            </p>
          )}

          {/* Code block */}
          {step.code && <CodeBlock code={step.code} language={step.language || 'bash'} />}

          {/* Env vars */}
          {step.envVars && step.envVars.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-[11px] font-mono-gs uppercase tracking-widest mb-2" style={{ color: 'var(--gs-text-muted)' }}>
                Required Variables
              </div>
              {step.envVars.map(v => (
                <EnvVarRow key={v.key} varObj={v} />
              ))}
            </div>
          )}

          {/* Checklist */}
          {step.checklist && (
            <ChecklistWidget items={step.checklist} />
          )}

          {/* Links */}
          {step.links && step.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {step.links.map(link => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer"
                   className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all hover:opacity-90 active:scale-[0.97]"
                   style={{ background: 'rgba(88,166,255,0.08)', color: '#58a6ff', border: '1px solid rgba(88,166,255,0.2)' }}>
                  {link.label} <ExternalLinkIcon />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChecklistWidget({ items }) {
  const [checked, setChecked] = useState(() => new Set());

  const toggle = (i) => setChecked(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  return (
    <ul className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i}
          className="flex items-start gap-3 cursor-pointer group/item"
          onClick={() => toggle(i)}>
          <div className="w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 transition-all"
            style={{
              background: checked.has(i) ? 'var(--gs-green)' : 'rgba(0,0,0,0.05)',
              border: `1.5px solid ${checked.has(i) ? 'var(--gs-green)' : 'var(--gs-text-muted)'}`,
            }}>
            {checked.has(i) && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </div>
          <span className="text-[13px] leading-relaxed transition-opacity"
            style={{ color: 'var(--gs-text-2)', textDecoration: checked.has(i) ? 'line-through' : 'none', opacity: checked.has(i) ? 0.5 : 1 }}>
            {item.text}
            {item.link && (
              <a href={item.link} target="_blank" rel="noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-[11px]" style={{ color: '#58a6ff' }}
                onClick={e => e.stopPropagation()}>
                View <ExternalLinkIcon />
              </a>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
