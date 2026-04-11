# GitStat Architecture

## Request Flow

1. User visits GitStat and clicks "Sign in with GitHub"
2. Frontend redirects to GitHub OAuth authorization URL
3. GitHub redirects back to `/auth/callback` with a one-time code
4. Backend exchanges the code for an access token via GitHub API
5. Backend stores the token in an in-memory session object
6. Backend sets an httpOnly session cookie and redirects to `/dashboard`
7. All subsequent GitHub API calls are made server-side using the stored token
8. Frontend only ever talks to the Express backend — never directly to GitHub

## Data Pipeline for Repo Analysis

1. `GET /api/repo/:owner/:repo/analyze` is called
2. Backend makes 3 parallel GitHub API calls:
   - `/repos/:owner/:repo/stats/contributors` — weekly commit history
   - `/repos/:owner/:repo/pulls?state=all` — PR data
   - `/repos/:owner/:repo/stats/punch_card` — hourly commit distribution
3. Health scores are computed server-side from the raw data
4. Computed scores are returned to the frontend as a single JSON response
5. Frontend renders contributor cards, charts, and sparklines from this response

## Large Repository Protection

All GitHub tree/file API calls use an `AbortController` with an 8-second timeout.
If a repo has more than 500 files in its tree, the backend automatically:
- Caps the analysis at the first 500 files (blobs only)
- Returns a `truncated: true` flag with `sampledCount` and `totalEstimate`
- Frontend renders a non-blocking amber banner informing the user

This means even `facebook/react` or `torvalds/linux` will return partial but valid data instead of crashing.

## Security Model

- GitHub access tokens are never sent to the frontend
- All GitHub API calls happen server-side with the user's own token
- Each user's token is rate-limited by GitHub independently (5000 req/hr per user)
- Session IDs are random UUIDs stored in httpOnly cookies
- Sessions expire after 1 hour via a cleanup interval
