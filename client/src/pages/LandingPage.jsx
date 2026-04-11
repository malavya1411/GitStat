import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const navItems = ['DASHBOARD', 'ANALYTICS', 'TEAM', 'SETTINGS'];
const sideRailIcons = ['◫', '◉', 'A.', '◌', '✦'];

const fadeInUp = {
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.35 },
  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
};

const GlassIconButton = ({ children, label }) => (
  <button
    type="button"
    aria-label={label}
    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/[0.1] hover:text-white"
  >
    {children}
  </button>
);

const LeftRibbon = () => (
  <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[240px] overflow-hidden lg:block">
    <svg
      viewBox="0 0 240 900"
      className="absolute -left-12 top-0 h-full w-full text-[#8dffad]/30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 30C70 94 116 138 132 178C149 221 141 263 93 311C46 359 -7 411 -31 453"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M32 4C98 72 148 122 168 170C190 222 184 272 136 326C93 374 33 430 5 473"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M24 662C79 600 120 562 145 563C172 566 190 594 196 644C204 693 206 770 236 830"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  </div>
);

const OrbitalBackdrop = () => (
  <div className="pointer-events-none absolute inset-y-0 right-[-24%] hidden w-[46%] lg:block">
    <div className="absolute right-[6%] top-[16%] h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,_rgba(99,255,149,0.18)_0%,_rgba(99,255,149,0.08)_28%,_rgba(99,255,149,0.02)_46%,_transparent_72%)] blur-[90px]" />
    <div className="absolute bottom-[8%] right-[-10%] h-[520px] w-[520px] rounded-full border border-[#b7ffd0]/10 opacity-30 blur-[0.6px]" />
    <svg
      viewBox="0 0 700 520"
      className="absolute bottom-[0%] right-[-18%] h-[470px] w-[580px] text-[#bfffd2]/22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M44 270C146 168 304 119 450 152C585 182 690 252 714 309" stroke="currentColor" strokeWidth="1.1" />
      <path d="M20 318C142 232 308 197 462 220C596 240 676 286 714 336" stroke="currentColor" strokeWidth="1.1" />
      <path d="M88 380C190 302 335 270 470 282C598 294 670 330 714 378" stroke="currentColor" strokeWidth="1.1" />
      <path d="M244 104C302 222 316 346 274 466" stroke="currentColor" strokeWidth="1.1" />
      <path d="M332 90C384 212 395 343 349 478" stroke="currentColor" strokeWidth="1.1" />
      <path d="M422 106C468 224 471 354 425 478" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  </div>
);

const DashboardPreview = () => (
  <div className="relative mx-auto w-full max-w-[690px]">
    <div className="absolute -inset-8 rounded-[40px] bg-[radial-gradient(circle_at_82%_18%,_rgba(135,255,185,0.34),_transparent_34%),radial-gradient(circle_at_50%_78%,_rgba(120,255,166,0.22),_transparent_40%)] blur-3xl" />
    <div className="relative overflow-hidden rounded-[34px] border border-white/14 bg-[linear-gradient(180deg,rgba(31,41,39,0.88),rgba(14,18,24,0.95))] p-2.5 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
      <div className="rounded-[28px] border border-white/10 bg-[#0b1017]/95 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between border-b border-white/6 px-3 pb-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#10281b] text-[#7bff9e] shadow-[0_0_18px_rgba(111,221,120,0.25)]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 3L5 14H11L10 21L19 10H13V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">Dashboard</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] text-white/55">
            Momentum
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[48px_minmax(0,1fr)]">
          <div className="hidden rounded-[20px] border border-white/8 bg-white/[0.02] py-3 md:flex md:flex-col md:items-center md:gap-3">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#0f2318] text-[#7aff9b]">↯</div>
            {sideRailIcons.map((icon, index) => (
              <div
                key={icon}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-[11px] ${
                  index === 1
                    ? 'bg-[#133120] text-[#8dffad] shadow-[0_0_16px_rgba(111,221,120,0.2)]'
                    : 'text-white/35'
                }`}
              >
                {icon}
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.65fr)_210px]">
              <div className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Velocity Trends</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">Jan to Aug</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/55">Monotone</div>
                </div>
                <div className="relative overflow-hidden rounded-[16px] border border-white/6 bg-[#0c1118] px-3 py-3">
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(105,255,153,0.06))]" />
                  <div className="absolute inset-y-3 left-3 right-3 grid grid-cols-6 gap-0">
                    {[...Array(6)].map((_, index) => (
                      <div key={index} className="border-r border-white/5 last:border-r-0" />
                    ))}
                  </div>
                  <svg viewBox="0 0 360 150" className="relative h-[132px] w-full text-[#79ff9c]" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 123C52 90 74 106 106 72C130 48 158 102 191 58C218 22 250 56 278 34C308 10 328 36 342 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="308" cy="34" r="6" fill="currentColor" />
                    <path d="M308 34L308 142" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              <div className="rounded-[20px] border border-white/8 bg-[radial-gradient(circle_at_25%_15%,rgba(121,255,156,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-3.5 lg:min-h-[206px]">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/90">Contributor Health</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">6 week pulse</p>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[
                    0.12, 0.72, 0.18, 0.88, 0.26, 0.68,
                    0.82, 0.16, 0.54, 0.22, 0.74, 0.32,
                    0.22, 0.84, 0.14, 0.62, 0.28, 0.9,
                    0.76, 0.24, 0.58, 0.18, 0.8, 0.38,
                    0.32, 0.78, 0.2, 0.86, 0.42, 0.7,
                    0.66, 0.22, 0.74, 0.28, 0.92, 0.18,
                  ].map((value, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-[6px] border border-white/5"
                      style={{
                        background: `rgba(105, 255, 153, ${Math.max(0.08, value)})`,
                        boxShadow: value > 0.8 ? '0 0 16px rgba(105,255,153,0.18)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_196px]">
              <div className="rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015))] p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-white/90">Contributor Health</p>
                  <div className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[10px] text-white/55">Governance</div>
                </div>
                <div className="grid grid-cols-10 gap-1.5">
                  {[
                    0.1, 0.8, 0.3, 0.55, 0.18, 0.74, 0.32, 0.7, 0.22, 0.82,
                    0.42, 0.2, 0.88, 0.24, 0.62, 0.16, 0.92, 0.3, 0.66, 0.44,
                    0.12, 0.68, 0.22, 0.84, 0.36, 0.72, 0.28, 0.54, 0.18, 0.9,
                    0.56, 0.26, 0.78, 0.38, 0.86, 0.22, 0.7, 0.32, 0.8, 0.46,
                  ].map((value, index) => (
                    <div
                      key={index}
                      className="h-5 rounded-[4px] border border-white/5"
                      style={{
                        background: `rgba(105, 255, 153, ${Math.max(0.08, value)})`,
                        boxShadow: value > 0.75 ? '0 0 14px rgba(105,255,153,0.18)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  ['Active Contributors', '2,450', '↗'],
                  ['Average Velocity', '8.9', '⌁'],
                  ['Risk Score', 'Low', '↓'],
                ].map(([label, value, icon]) => (
                  <div
                    key={label}
                    className="relative min-h-[96px] overflow-hidden rounded-[20px] border border-[#79ff9c]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(121,255,156,0.04))] px-4 py-4 shadow-[inset_0_0_0_1px_rgba(121,255,156,0.03)]"
                  >
                    <div className="pr-12">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-white/35">{label}</p>
                      <p className={`mt-2 text-[2.35rem] font-semibold leading-none tracking-tight ${label === 'Average Velocity' ? 'text-white' : 'text-[#7eff9f]'}`}>
                        {value}
                      </p>
                    </div>
                    <div className="absolute right-3.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl bg-white/[0.05] text-[#89ffab]">
                      {icon}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LandingPage = () => {
  const { user, loading, loginWithGithub } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="relative h-screen overflow-hidden bg-[#071016] text-[#edf3ee] selection:bg-[#63ff95]/30">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_84%,rgba(103,255,152,0.2),transparent_28%),radial-gradient(circle_at_86%_15%,rgba(103,255,152,0.16),transparent_24%),linear-gradient(90deg,#0d1a1d_0%,#06111a_48%,#0b1717_100%)]" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '100% 140px' }} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_32%,rgba(1,6,8,0.5)_72%,rgba(1,6,8,0.82)_100%)]" />
        <div className="absolute inset-0 opacity-[0.025] mix-blend-screen" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.7%27 numOctaves=%273%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E')" }} />
        <div className="absolute inset-y-0 left-[4%] hidden w-px bg-[linear-gradient(180deg,transparent,rgba(190,255,220,0.14),transparent)] lg:block" />
        <div className="absolute inset-y-0 left-[46%] hidden w-px bg-[linear-gradient(180deg,transparent,rgba(190,255,220,0.14),transparent)] lg:block" />
        <div className="absolute inset-y-[10%] right-[4%] hidden w-px bg-[linear-gradient(180deg,transparent,rgba(190,255,220,0.1),transparent)] xl:block" />
      </div>

      <LeftRibbon />
      <OrbitalBackdrop />

      <nav className="relative z-20 px-4 pt-5 sm:px-8 lg:px-14">
        <motion.div
          initial={{ opacity: 0, y: -24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex max-w-[1120px] items-center justify-between gap-4 rounded-[22px] border border-white/12 bg-[linear-gradient(90deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03),rgba(121,255,156,0.06))] px-4 py-3 shadow-[0_20px_80px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:px-6"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#10281b] text-[#73ff98] shadow-[0_0_20px_rgba(111,221,120,0.25)]">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 3L5 14H11L10 21L19 10H13V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[1.75rem] font-medium tracking-[-0.04em] text-white">GitStat</span>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            {navItems.map((item, index) => (
              <button
                key={item}
                type="button"
                className={`rounded-2xl px-5 py-2 text-[0.92rem] tracking-[0.04em] transition ${
                  index === 0
                    ? 'border border-white/12 bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]'
                    : 'text-white/58 hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <GlassIconButton label="Notifications">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5C8.96 5 7 6.96 7 10V12.5L5.29 15.36C5.11 15.66 5.32 16.04 5.67 16.04H18.33C18.68 16.04 18.89 15.66 18.71 15.36L17 12.5V10C17 6.96 15.04 5 12 5Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M10 18C10.38 19.16 11.12 19.75 12 19.75C12.88 19.75 13.62 19.16 14 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </GlassIconButton>
              <GlassIconButton label="Settings">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M19.4 15A1 1 0 0 0 19.6 16.1L19.65 16.15A1.2 1.2 0 0 1 17.95 17.85L17.9 17.8A1 1 0 0 0 16.8 17.6A1 1 0 0 0 16.2 18.5V18.65A1.2 1.2 0 1 1 13.8 18.65V18.58A1 1 0 0 0 13.1 17.66A1 1 0 0 0 12.05 17.88L11.95 17.95A1.2 1.2 0 0 1 10.25 16.25L10.3 16.2A1 1 0 0 0 10.5 15.1A1 1 0 0 0 9.6 14.5H9.45A1.2 1.2 0 1 1 9.45 12.1H9.52A1 1 0 0 0 10.44 11.4A1 1 0 0 0 10.22 10.35L10.15 10.25A1.2 1.2 0 0 1 11.85 8.55L11.9 8.6A1 1 0 0 0 13 8.4A1 1 0 0 0 13.6 7.5V7.35A1.2 1.2 0 1 1 16 7.35V7.42A1 1 0 0 0 16.7 8.34A1 1 0 0 0 17.75 8.12L17.85 8.05A1.2 1.2 0 0 1 19.55 9.75L19.5 9.8A1 1 0 0 0 19.3 10.9A1 1 0 0 0 20.2 11.5H20.35A1.2 1.2 0 1 1 20.35 13.9H20.28A1 1 0 0 0 19.36 14.6L19.4 15Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </GlassIconButton>
            </div>
            <button
              type="button"
              onClick={loginWithGithub}
              className="rounded-2xl border border-white/12 bg-white/[0.06] px-5 py-3 text-sm font-medium tracking-[0.08em] text-white/90 transition hover:bg-white/[0.12]"
            >
              SIGN IN
            </button>
          </div>
        </motion.div>
      </nav>

      <main className="relative z-10 mx-auto flex h-[calc(100vh-104px)] max-w-[1320px] flex-col justify-center gap-10 overflow-hidden px-6 pb-8 pt-8 sm:px-8 lg:flex-row lg:items-center lg:gap-8 lg:px-14 lg:pt-8">
        <motion.section
          {...fadeInUp}
          className="w-full max-w-[540px] lg:pr-4"
        >
          <h1 className="max-w-[540px] text-[3.1rem] font-medium tracking-[-0.08em] text-white sm:text-[4rem] lg:text-[4.45rem] xl:text-[4.8rem]">
            <span className="block leading-[0.94]">Understand</span>
            <span className="block leading-[0.94]">who&apos;s building.</span>
            <span className="mt-2 block leading-[0.94]">Before they</span>
            <span className="block leading-[0.94]">disappear.</span>
          </h1>

          <p className="mt-6 max-w-[420px] text-base leading-relaxed text-white/52 lg:text-[1.05rem]">
            Elite analytics for engineering leaders. Monitor contributor health, velocity, and alignment through a sovereign technical lens.
          </p>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={loginWithGithub}
              className="inline-flex min-h-14 items-center gap-3 rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(231,238,234,0.9))] px-7 py-4 text-base font-semibold tracking-[0.02em] text-[#071016] shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition hover:translate-y-[-1px] hover:bg-white"
            >
              <svg viewBox="0 0 16 16" className="h-5 w-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.22C6.02 15.04 6.01 14.44 6.01 13.65C4 14.02 3.48 13.16 3.32 12.73C3.23 12.5 2.84 11.79 2.5 11.6C2.22 11.45 1.82 11.08 2.49 11.07C3.12 11.06 3.57 11.65 3.72 11.88C4.44 13.09 5.59 12.75 6.05 12.54C6.12 12.02 6.33 11.67 6.56 11.47C4.78 11.27 2.92 10.58 2.92 7.52C2.92 6.65 3.23 5.93 3.74 5.37C3.66 5.17 3.38 4.35 3.82 3.25C3.82 3.25 4.49 3.04 6.02 4.08C6.66 3.9 7.34 3.81 8.02 3.81C8.7 3.81 9.38 3.9 10.02 4.08C11.55 3.03 12.22 3.25 12.22 3.25C12.66 4.35 12.38 5.17 12.3 5.37C12.81 5.93 13.12 6.64 13.12 7.52C13.12 10.59 11.25 11.26 9.47 11.46C9.76 11.71 10.01 12.19 10.01 12.95C10.01 14.03 10 14.9 10 15.22C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" />
              </svg>
              Sign in with GitHub
            </button>
            <p className="text-sm leading-relaxed text-white/38">
              Start with the GitHub connection and go straight into the dashboard.
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 36, scale: 0.97 }}
          whileInView={{ opacity: 1, x: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.28 }}
          transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex w-full flex-1 items-start justify-center pt-4 lg:justify-end lg:pt-10 lg:pr-8 xl:pt-12 xl:pr-12 lg:scale-[0.88] xl:scale-[0.92]"
          style={{ transformOrigin: 'center center' }}
        >
          <DashboardPreview />
        </motion.section>
      </main>
    </div>
  );
};

export default LandingPage;
