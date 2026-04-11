export const computeTimeMachineStats = (c, offsetWeeks) => {
  if (!c || !c.weekly_commits) return c;
  
  // Cut off the most recent `offsetWeeks` of data to simulate the past
  const simulatedHistory = c.weekly_commits.slice(0, c.weekly_commits.length - offsetWeeks);
  if (simulatedHistory.length === 0) return { ...c, health_score: 0, velocity_score: 0, streak_score: 0 };

  const last12 = simulatedHistory.slice(Math.max(0, simulatedHistory.length - 12));
  
  let recentCommitsTotal = 0;
  let priorCommitsTotal = 0;
  
  for (let i = 0; i < last12.length; i++) {
     if (i >= last12.length - 4) recentCommitsTotal += last12[i];
     if (i >= last12.length - 8 && i < last12.length - 4) priorCommitsTotal += last12[i];
  }
  
  const recent = recentCommitsTotal / 4;
  const prior = priorCommitsTotal / 4;
  const trend = (recent - prior) / Math.max(prior, 1);
  const velocity_score = Math.round(Math.min(100, Math.max(0, 50 + trend * 50)));
  
  let current_streak = 0;
  let peak_streak = 0;
  let c_streak = 0;
  
  for (let i = 0; i < last12.length; i++) {
     if (last12[i] > 0) {
        c_streak++;
        if (c_streak > peak_streak) peak_streak = c_streak;
     } else {
        c_streak = 0;
     }
  }
  
  for (let i = last12.length - 1; i >= 0; i--) {
     if (last12[i] > 0) current_streak++;
     else break;
  }
  
  const streak_score = Math.round((current_streak / Math.max(peak_streak, 1)) * 100);
  
  // Re-calculate health score using static PR and response latency for simplicity, but weighting new temporal metrics
  const health_score = Math.round(
    velocity_score * 0.28 +
    streak_score * 0.22 +
    c.pr_score * 0.18 +
    c.offhours_score * 0.14 +
    c.response_latency_score * 0.18
  );

  return { ...c, health_score, velocity_score, streak_score, current_streak, peak_streak };
};

export const predictBurnout = (c, offsetWeeks = 0) => {
  const history = c.weekly_commits.slice(0, c.weekly_commits.length - offsetWeeks);
  const windowLength = 6;
  if (history.length < windowLength) return null;
  
  const y = history.slice(history.length - windowLength);
  const x = Array.from({length: windowLength}, (_, i) => i);
  
  // Linear regression slope
  const n = windowLength;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // If slope is consistently negative and they are currently contributing
  const currentlyActive = y[y.length - 1] > 0 || y[y.length - 2] > 0;
  
  if (slope < -0.5 && currentlyActive) {
    // Project when it hits 0
    // y = mx + b => 0 = mx + b => x = -b/m
    // x is week index (current is windowLength-1)
    const zeroCrossing = -intercept / slope;
    const weeksRemaining = Math.max(0, Math.round(zeroCrossing - (windowLength - 1)));
    
    // Only flag if it's within the next 8 weeks
    if (weeksRemaining > 0 && weeksRemaining <= 8) {
      return {
        // backward-compat fields used by ContributorCard
        isBurnoutRisk: true,
        weeksRemaining,
        // new fields used by burnout modal
        atRisk: true,
        weeksToFade: weeksRemaining,
        currentWeeklyCommits: y[y.length - 1],
        slope: slope.toFixed(2),
      };
    }
  }
  return null;
};
