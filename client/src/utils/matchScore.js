export const computeMatchScore = (userProfile, repo) => {
  if (!userProfile) return null;
  
  const scores = {};
  const insights = [];

  // Language match (0-100)
  const repoLang = repo.language;
  const userLangs = Object.keys(userProfile.topLanguages || {});
  if (repoLang && userLangs.includes(repoLang)) {
    const rank = userLangs.indexOf(repoLang);
    scores.language = rank === 0 ? 100 : rank === 1 ? 80 : 60;
    insights.push({ type: 'positive', text: `Matches your ${repoLang} background` });
  } else if (repoLang) {
    scores.language = 20;
    insights.push({ type: 'warning', text: `Uses ${repoLang} — outside your usual stack` });
  } else {
    scores.language = 50;
  }

  // Community size fit (0-100)
  const stars = repo.stargazers_count;
  const preferred = userProfile.preferredRepoSize;
  if (
    (preferred === 'small' && stars < 500) ||
    (preferred === 'medium' && stars >= 500 && stars <= 10000) ||
    (preferred === 'large' && stars > 10000)
  ) {
    scores.size = 100;
    insights.push({ type: 'positive', text: 'Community size fits your style' });
  } else if (
    (preferred === 'small' && stars > 10000) ||
    (preferred === 'large' && stars < 500)
  ) {
    scores.size = 20;
    insights.push({ type: 'warning', text: 'Much ' + (stars > 10000 ? 'larger' : 'smaller') + ' community than you usually contribute to' });
  } else {
    scores.size = 60;
    insights.push({ type: 'neutral', text: 'Slightly different community size than usual' });
  }

  // Activity pace match (0-100)
  const daysSincePush = Math.floor((Date.now() - new Date(repo.pushed_at)) / (1000 * 60 * 60 * 24));
  const repoActivity = daysSincePush < 3 ? 'high' : daysSincePush < 14 ? 'medium' : 'low';
  if (repoActivity === userProfile.activityLevel) {
    scores.pace = 100;
    insights.push({ type: 'positive', text: 'Pace fits your contribution rhythm' });
  } else if (
    (repoActivity === 'high' && userProfile.activityLevel === 'low') ||
    (repoActivity === 'low' && userProfile.activityLevel === 'high')
  ) {
    scores.pace = 20;
    insights.push({ type: 'warning', text: 'Repo moves ' + (repoActivity === 'high' ? 'faster' : 'slower') + ' than your usual pace' });
  } else {
    scores.pace = 60;
  }

  // Open issues opportunity (0-100)
  const issues = repo.open_issues_count;
  if (issues > 10 && issues < 500) {
    scores.opportunity = 100;
    insights.push({ type: 'positive', text: `${issues} open issues — good entry points` });
  } else if (issues >= 500) {
    scores.opportunity = 60;
    insights.push({ type: 'neutral', text: 'Large issue backlog — competitive' });
  } else {
    scores.opportunity = 30;
    insights.push({ type: 'warning', text: 'Few open issues right now' });
  }

  // Weighted final score
  const final = Math.round(
    scores.language * 0.35 +
    scores.size * 0.25 +
    scores.pace * 0.25 +
    scores.opportunity * 0.15
  );

  return { score: final, insights: insights.slice(0, 3) };
};
