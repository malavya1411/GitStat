import React, { useEffect, useRef, useState } from 'react';

/* ── Health score → color ── */
const getHealthColor = (score) => {
  if (score <= 40) return 'var(--gs-red)';
  if (score <= 65) return 'var(--gs-amber)';
  if (score <= 85) return 'var(--gs-green)';
  return 'var(--gs-purple)';
};

/* ── Sparkline from weekly_commits ── */
const Sparkline = ({ data = [], color }) => {
  const W = 120, H = 24;
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x},${y}`;
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

/* ── Circular SVG progress ring ── */
const HealthRing = ({ score, color, animate }) => {
  const R = 24;
  const CIRC = 2 * Math.PI * R;
  const pct = Math.min(Math.max(score, 0), 100) / 100;
  const offset = animate ? CIRC - pct * CIRC : CIRC;

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="health-ring-svg w-14 h-14" viewBox="0 0 56 56" aria-hidden="true">
        {/* Track */}
        <circle
          cx="28" cy="28" r={R}
          fill="none"
          stroke="var(--gs-surface-high)"
          strokeWidth="4"
        />
        {/* Fill */}
        <circle
          cx="28" cy="28" r={R}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{ transition: animate ? 'stroke-dashoffset 600ms ease-out' : 'none' }}
        />
      </svg>
      {/* Score label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-mono-gs font-bold leading-none"
          style={{ color: 'var(--gs-text)', fontSize: '11px' }}
        >
          {score}
        </span>
      </div>
    </div>
  );
};

/* ── Animated score bar ── */
const ScoreBar = ({ label, value, displayValue, score, color, delay = 0 }) => {
  const barRef = useRef(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span
          className="font-mono-gs text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--gs-text-2)', fontFamily: "'Geist Sans', sans-serif" }}
        >
          {label}
        </span>
        <span
          className="font-mono-gs text-[10px] font-bold"
          style={{ color: 'var(--gs-text)', fontFamily: "'JetBrains Mono', monospace" }}
        >
          {displayValue}
        </span>
      </div>
      <div
        className="h-[3px] rounded-full overflow-hidden"
        style={{ background: 'var(--gs-surface-high)' }}
      >
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{
            background: color,
            width: animated ? `${Math.max(4, Math.min(score, 100))}%` : '0%',
            transition: `width 600ms ease-out ${delay}ms`,
          }}
        />
      </div>
    </div>
  );
};

/* ── Main card ── */
const ContributorCard = ({ data, onClick, role = 'Project Contributor', style: cardStyle = {}, animationDelay = 0 }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small timeout to trigger entrance + ring animation
    const t = setTimeout(() => setMounted(true), animationDelay + 20);
    return () => clearTimeout(t);
  }, [animationDelay]);

  const color = getHealthColor(data.health_score);

  const prRatePct = data.prs_opened > 0
    ? Math.round((data.prs_merged / data.prs_opened) * 100)
    : 0;

  const metrics = [
    { label: 'Velocity', score: data.velocity_score ?? 0, displayValue: `${data.velocity_score ?? 0}%` },
    { label: 'Streak', score: data.streak_score ?? 0, displayValue: `${data.current_streak ?? 0}d` },
    { label: 'PR Rate', score: data.pr_score ?? 0, displayValue: `${prRatePct}%` },
    { label: 'Hours', score: data.offhours_score ?? 0, displayValue: `${data.offhours_score ?? 0}` },
  ];

  return (
    <article
      onClick={onClick}
      id={`contributor-card-${data.login}`}
      className="relative rounded-xl overflow-hidden cursor-pointer group"
      style={{
        background: 'var(--gs-card)',
        border: '1px solid var(--gs-border)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 300ms ease-out ${animationDelay}ms, transform 300ms ease-out ${animationDelay}ms, background 200ms ease, border-color 200ms ease, box-shadow 200ms ease`,
        ...cardStyle,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--gs-card-hover)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 30px rgba(0,0,0,0.25)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--gs-card)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Subtle tint overlay on hover */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle at 80% 20%, ${color}18, transparent 60%)` }}
        aria-hidden="true"
      />

      <div className="relative p-6">
        {/* ── Header: avatar + name + ring ── */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            {/* Avatar with colored border */}
            <div
              className="rounded-full overflow-hidden shrink-0"
              style={{
                width: 48,
                height: 48,
                border: `2px solid ${color}`,
                boxShadow: `0 0 0 1px ${color}33`,
              }}
            >
              <img
                src={data.avatar_url}
                alt={data.login}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Username + role */}
            <div className="min-w-0">
              <a
                href={`https://github.com/${data.login}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 font-bold truncate hover:underline font-mono-gs"
                style={{ color, fontFamily: "'JetBrains Mono', monospace", fontSize: '0.85rem' }}
                onClick={e => e.stopPropagation()}
              >
                @{data.login}
                {data.burnoutRisk && (
                  <span className="shrink-0 px-1.5 py-[1px] rounded text-[8px] uppercase tracking-widest font-black"
                        style={{ background: 'var(--gs-red)', color: '#000', outline: '1px solid rgba(248,81,73,0.3)' }}>
                    Risk
                  </span>
                )}
              </a>
              <p className="text-[10px] mt-1 truncate" style={{ color: 'var(--gs-text-2)' }}>
                {data.burnoutRisk 
                  ? <span style={{ color: 'var(--gs-red)' }}>Fading in ~{data.burnoutRisk.weeksRemaining} wks</span> 
                  : role}
              </p>
            </div>
          </div>

          {/* Health ring */}
          <HealthRing score={data.health_score} color={color} animate={mounted} />
        </div>

        {/* ── Score bars ── */}
        <div className="space-y-3 mb-5">
          {metrics.map((m, i) => (
            <ScoreBar
              key={m.label}
              label={m.label}
              score={m.score}
              displayValue={m.displayValue}
              color={color}
              delay={animationDelay + i * 80}
            />
          ))}
        </div>

        {/* ── Sparkline ── */}
        <div
          className="pt-4 mt-2"
          style={{ borderTop: '1px solid var(--gs-border)' }}
        >
          <Sparkline data={data.weekly_commits} color={color} />
        </div>
      </div>
    </article>
  );
};

export default ContributorCard;
