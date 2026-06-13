import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TIPS = [
  "Render's free tier spins down the backend after 15 minutes of inactivity. Waking up the server...",
  "GitStat monitors commit velocity and developer burnout patterns dynamically.",
  "Healthy codebases depend on sustainable work schedules. Remember to take regular breaks!",
  "The no-line editorial design system is inspired by high-end typography and digital curating.",
  "GitStat runs AI heuristics on repository activity to identify burn-out risks early.",
  "Did you know? Clear, descriptive commit messages save hours of debugging down the road.",
  "Analyzing developer activity requires empathy. GitStat tracks work trends, not individual hours."
];

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [showSlowWarning, setShowSlowWarning] = useState(false);

  // Simulated progress loop mimicking Render's 50s spin up
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        const next = prev + 1;
        if (next >= 2) {
          setShowSlowWarning(true);
        }
        return next;
      });

      setProgress((prev) => {
        if (prev < 30) {
          // Fast start
          return prev + Math.floor(Math.random() * 4) + 3;
        } else if (prev < 65) {
          // Medium progress
          return prev + Math.floor(Math.random() * 2) + 1.5;
        } else if (prev < 90) {
          // Slowing down
          return prev + Math.floor(Math.random() * 2) + 0.5;
        } else if (prev < 97) {
          // Creeping up to 98%
          return prev + 0.2;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Tip rotation loop
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 6000);
    return () => clearInterval(tipTimer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 transition-colors duration-300"
      style={{ background: 'var(--gs-bg)', color: 'var(--gs-text)' }}
    >
      {/* Noise Overlay */}
      <div className="noise-overlay" />

      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(111,221,120,0.06)_0%,_transparent_70%)] blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[480px] rounded-2xl border p-8 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-10"
        style={{ backgroundColor: 'var(--gs-card)', borderColor: 'var(--gs-border)' }}
      >
        {/* App Logo Indicator */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#10281b] text-[#73ff98] shadow-[0_0_20px_rgba(111,221,120,0.25)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 3L5 14H11L10 21L19 10H13V3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[1.85rem] font-medium tracking-[-0.04em]" style={{ color: 'var(--gs-text)' }}>GitStat</span>
        </div>

        {/* Loading Message */}
        <div className="mb-6 text-center">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--gs-primary)' }}>
            {showSlowWarning ? 'Waking up the server' : 'Verifying Session'}
          </h2>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--gs-text-2)' }}>
            {showSlowWarning 
              ? 'Render free instances spin down automatically. Waking up normally takes 40-50 seconds.' 
              : 'Establishing connection to the analytical engine...'}
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="relative mb-5 h-2 w-full overflow-hidden rounded-full bg-white/5" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r"
            style={{
              width: `${Math.min(100, progress)}%`,
              backgroundImage: 'linear-gradient(90deg, var(--gs-green), var(--gs-primary))',
              boxShadow: '0 0 12px rgba(111,221,120,0.3)',
            }}
            transition={{ type: 'tween', ease: 'easeInOut' }}
          />
        </div>

        {/* Status Line */}
        <div className="flex items-center justify-between text-[11px] font-mono-gs" style={{ color: 'var(--gs-text-muted)' }}>
          <span>{Math.round(progress)}% loaded</span>
          <span>Elapsed: {seconds}s / Est. 50s</span>
        </div>

        {/* Rotating Tips Box */}
        <div 
          className="mt-8 min-h-[64px] border-t pt-5 text-center"
          style={{ borderColor: 'var(--gs-border-subtle)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--gs-text-muted)' }}>
            Developer Notes
          </p>
          <div className="mt-2 overflow-hidden px-2">
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="text-[11px] leading-relaxed italic"
                style={{ color: 'var(--gs-text-2)' }}
              >
                &ldquo;{TIPS[tipIndex]}&rdquo;
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
