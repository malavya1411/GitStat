# GitStat

> Understand who's building. Before they disappear.

GitStat is an open-source GitHub contributor health dashboard. It helps maintainers and engineering leads identify burnout signals, knowledge concentration risks, and contribution patterns across any public or private repository — in real time, powered by the GitHub API and Google Gemini AI.

[![GitStat Health](https://img.shields.io/badge/built%20with-React%20%2B%20Express-61dafb?style=flat-square)](https://github.com/malavya1411/GitStat)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

---

## Key Features

### 🧠 Contributor Health Scoring
Every contributor receives a composite **Health Score (0–100)** calculated from five weighted signals:

| Signal | Weight | What it measures |
|---|---|---|
| Velocity Score | 28% | Commit growth trend — recent 4 weeks vs prior 4 weeks |
| Streak Score | 22% | Consistency — current streak vs all-time peak streak |
| PR Score | 18% | Follow-through rate — PRs merged / PRs opened |
| Response Latency Score | 18% | Speed of engagement with open pull requests |
| Off-Hours Score | 14% | Inverse of late-night/weekend commit ratio (burnout signal) |

Contributors are classified into four health bands: **At Risk** (0–40) · **Stressed** (41–65) · **Healthy** (66–85) · **Thriving** (86–100)

---

### 🔥 Burnout Prediction
GitStat runs **linear regression on the last 6 weeks** of commit activity for every active contributor. If the slope is consistently negative and the contributor is still active, GitStat projects exactly when they will go silent — and flags them before it happens.

- **Overview Page** — "Run Burnout Prediction" button with live risk count badge
- Per-contributor sparkline + weeks-to-fade estimate + slope data
- Uses the same algorithm on the Contributors page with a Time Machine slider

---

### ⏳ Repo Health Time Machine
A slider on the Contributors page lets you **replay contributor metrics backwards up to 10 weeks** — recalculating velocity, streaks, and health scores for any historical point. Useful for understanding when a project started to decline.

---

### 👻 Ghost Contributor Detector
Automatically identifies contributors who were active in the previous 8 weeks but have had **zero commits in the last 4 weeks** — the first signal of silent churn.

---

### 🗺️ Bus Factor Heatmap
Analyses the last 10 commits per file across up to 40 files to compute **unique author counts per file**. Files with a single author are flagged as high risk.

- **Bus Factor Score** = `(files with 2+ authors / total files) × 100`
- Color-coded heatmap tiles (🔴 High / 🟡 Medium / 🟢 Low)
- Aggregated score shown on the Overview page KPI bar

---

### 🤖 AI README Scorecard (Gemini 2.5 Flash)
Sends the repo's README to Gemini AI and returns a structured **0–10 score** across six onboarding dimensions:

`Setup Guide` · `Contribution Guidelines` · `Code of Conduct` · `License` · `Contact` · `Purpose`

Includes actionable AI-generated suggestions for improving onboarding quality.

---

### 🏗️ Architecture Visualizer
Recursively maps the file tree (up to 500 files) and renders it in one of three modes based on repo size:

| Repo Size | View Mode |
|---|---|
| < 50 files | Collapsible file tree with expand/collapse |
| 50–299 files | Categorized directory cards with file lists |
| 300+ files | Cluster map: Source · API · UI · Data · Utils · Tests · Config · Docs |

Comes with **automatic tech stack detection** — identifies languages (TS, JS, Python, Rust, Go, Java, etc.), frameworks (React, Next.js, Django, Express, etc.), tools (Docker, GitHub Actions, Kubernetes, Terraform), and package managers from the file tree and `package.json`.

---

### 🌐 Cross-Repo Network Graph
A **force-directed graph** (via `react-force-graph-2d`) that visualises contributor–repository connections across all repos analysed in the current session. Identifies **load-bearing contributors** — developers who span multiple projects and are a single point of failure.

---

### ⚖️ Repo Compare
Side-by-side comparison of any two repositories across five metrics: PR success rate, contributor count, velocity, total commits, and newbie friendliness score. Search is debounced live against the GitHub API.

---

### 🔄 Pull Requests & Deployments
- **Pull Requests** — Filterable table (All / Open / Merged / Closed) with time-to-merge calculation and author attribution
- **Deployments** — Timeline view with success/failure/pending status badges, environment label, git ref, and creator info. Includes a success rate KPI.

---

### 🏷️ Embeddable Health Badge
Each analysed repo gets a **dynamic SVG badge** hosted at `/badge/:owner/:repo` that can be embedded in a README with a single line of Markdown — reflecting the live average contributor health score.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express |
| Auth | GitHub OAuth 2.0 (session cookie, no JWT) |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Data Source | GitHub REST API v3 |
| Charts | Chart.js, react-force-graph-2d |
| Typography | Geist Sans, JetBrains Mono, Newsreader, Manrope |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A GitHub OAuth App (free) — [create one here](https://github.com/settings/developers)
- A Gemini API key (free) — [get one here](https://aistudio.google.com/app/apikey)

### Installation

```bash
# Clone the repository
git clone https://github.com/malavya1411/GitStat.git
cd GitStat

# Install all dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### Environment Variables

Create `server/.env`:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=5001
FRONTEND_URL=http://localhost:5173
```

### Running Locally

```bash
# From the root directory
npm run dev
```

Frontend → `http://localhost:5173`  
Backend  → `http://localhost:5001`

### GitHub OAuth Setup

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. Homepage URL: `http://localhost:5173`
3. Authorization callback URL: `http://localhost:5001/auth/callback`
4. Copy the **Client ID** and a generated **Client Secret** into `server/.env`

---

## Project Structure

```
GitStat/
├── client/
│   └── src/
│       ├── pages/           # 10 route-level page components
│       ├── components/      # RepoLayout, ContributorCard, ChartDrawer
│       │   └── Architecture/# Tech stack, arch graph, setup guide
│       ├── context/         # AuthContext, ThemeContext (dark/light)
│       ├── hooks/           # useRepoArchitecture
│       └── utils/           # metrics.js, matchScore.js, apiCache.js
└── server/
    ├── routes/              # auth.js, repo.js, ai.js
    ├── middleware/          # requireAuth.js
    └── services/            # githubService.js (fetch + timeout)
```

---

## Pages at a Glance

| Route | Page | Highlight |
|---|---|---|
| `/` | Landing | Cinematic hero, GitHub OAuth entry |
| `/dashboard` | Dashboard | Repo search with personalised match scoring |
| `/repos` | Your Repos | Filter, sort, and launch analysis from your own repos |
| `/repo/:o/:r/overview` | Overview | KPIs, health heatmap, burnout modal, AI README score |
| `/repo/:o/:r` | Contributors | Cards, time machine, ghost detector, burnout prediction |
| `/repo/:o/:r/deep-analysis` | Architecture | Tech stack, file tree/cluster, setup guide |
| `/repo/:o/:r/pulls` | Pull Requests | Filterable table with merge time stats |
| `/repo/:o/:r/deployments` | Deployments | Timeline with success rate |
| `/repo/:o/:r/compare` | Compare | Side-by-side repo metrics |
| `/network` | Network Graph | Cross-repo contributor force graph |

---

## Contributing

Contributions are welcome. Before touching the health score or burnout logic in `server/utils/analysis.js` or `client/src/utils/metrics.js`, please review the weighting table above and open an issue to discuss changes to the scoring model.

## License

MIT
