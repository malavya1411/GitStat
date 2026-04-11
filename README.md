# GitStat

> Understand who's building. Before they disappear.

GitStat is an open source GitHub contributor health dashboard that helps maintainers identify burnout signals, single-contributor bottlenecks, and contribution patterns across any public repository — in real time.

## What it does

- **Contributor Health Scoring** — Every contributor gets a health score (0–100) computed from velocity trend, commit streak, PR follow-through rate, and off-hours activity ratio
- **Burnout Prediction** — Detects contributors on a negative trajectory before they go silent, with a projected fade date
- **Bus Factor Heatmap** — Identifies files owned by a single contributor, surfacing dangerous knowledge concentration
- **DNA Radar Chart** — A 6-axis fingerprint of each contributor's working style (Morning Person, Weekend Warrior, PR Quality, Burst Worker, Reviewer, Fast Responder)
- **README AI Evaluator** — Scores any repo's README across 8 onboarding dimensions using AI
- **Architecture Mapper** — Recursively maps the file structure and visualizes it as a force graph or file tree depending on repo size
- **CI/CD Health** — Tracks workflow run pass rates per contributor
- **Live Sprint Mode** — Real-time leaderboard of the last 7 days of activity

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| Backend | Node.js, Express |
| Auth | GitHub OAuth 2.0 |
| Data | GitHub REST API |
| AI | Google Gemini 1.5 Flash |
| Charts | Chart.js, react-force-graph-2d |
| Animation | Framer Motion |
| Icons | Lucide React |

## Getting Started

### Prerequisites
- Node.js 18+
- A GitHub OAuth App (free) — [create one here](https://github.com/settings/developers)
- A Gemini API key (free) — [get one here](https://aistudio.google.com/app/apikey)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gitstat.git
cd gitstat

# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

### Environment Variables

Create a file at `server/.env` with the following:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=5001
```

### Running Locally

```bash
# From the root directory
npm run dev
```

Frontend runs at `http://localhost:5173`  
Backend runs at `http://localhost:5001`

### GitHub OAuth Setup

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set Homepage URL to `http://localhost:5173`
4. Set Authorization callback URL to `http://localhost:5001/auth/callback`
5. Copy the Client ID and generate a Client Secret
6. Paste both into your `server/.env`

## Architecture

```
gitstat/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level page components
│   │   └── main.jsx        # App entry point
└── server/                 # Node + Express backend
    ├── routes/             # API route handlers
    ├── services/           # GitHub API service layer
    └── server.js           # Server entry point
```

## Health Score Calculation

Each contributor's health score is a weighted composite of four signals:

| Signal | Weight | Description |
|---|---|---|
| Velocity Score | 35% | Commit trend over last 12 weeks (recent 4 vs prior 4) |
| Streak Score | 30% | Current streak vs peak streak ratio |
| PR Score | 20% | PR follow-through rate (merged / opened) |
| Off-hours Score | 15% | Inverse of late-night / weekend commit ratio |

## Contributing

Contributions are welcome. Please read the health score calculation above before submitting PRs that touch the scoring logic.

## License

MIT
