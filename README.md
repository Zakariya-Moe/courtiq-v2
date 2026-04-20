# CourtIQ

Live NBA performance engine. Real-time scores, player analytics, signal intelligence.

Built with Next.js 14, Supabase, and Vercel.

---

## What it does

- **Live scores** — today's games with real-time score updates
- **Box scores** — full player stats for every game
- **Player profiles** — animated performance charts, season vs recent toggle, game log
- **Team pages** — roster, W/L record, official season stats
- **Signals** — AI-driven performance alerts (hot streak, breakout game, cold streak)
- **Search** — find any player by name
- **Trending** — top performers ranked by points, rebounds, assists
- **Favorites** — follow players, personalized signal feed
- **PWA** — installable on iOS and Android

---

## Tech stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Data | NBA Stats API (stats.nba.com) |
| Styling | Pure CSS, no UI library |

---

## Setup

### 1. Supabase — run this SQL migration

```sql
create table if not exists games (
  id text primary key,
  home_team text not null,
  away_team text not null,
  home_score integer default 0,
  away_score integer default 0,
  status text default 'scheduled',
  stats_finalized boolean default false,
  last_updated timestamptz default now()
);

create table if not exists player_stats (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  player_id text not null,
  player_name text not null,
  team_abbr text not null,
  points integer default 0,
  rebounds integer default 0,
  assists integer default 0,
  steals integer default 0,
  blocks integer default 0,
  turnovers integer default 0,
  minutes text,
  fg_made integer default 0,
  fg_attempted integer default 0,
  fg3_made integer default 0,
  fg3_attempted integer default 0,
  ft_made integer default 0,
  ft_attempted integer default 0,
  last_updated timestamptz default now(),
  unique(game_id, player_id)
);
```

### 2. Environment variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-random-secret
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 3. Install and run

```bash
npm install
npm run dev
```

### 4. Seed data

Hit `/api/test-nba` to pull today's games into Supabase.

---

## Deploy to Vercel

1. Push repo to GitHub
2. Import in Vercel — set Root Directory to `courtiq-clean`
3. Add all 4 environment variables
4. Deploy
5. Hit `/api/test-nba` to seed initial data
6. Verify at `/api/health`

Cron runs daily at midnight to refresh scores.

---

## API routes

| Route | Description | Cache |
|-------|-------------|-------|
| `GET /api/games` | Today's games | 30s |
| `GET /api/games/[id]` | Game detail + box score | 30s |
| `GET /api/players/[id]` | Player stats + game log | 60s |
| `GET /api/players/[id]/season` | Official season averages | 1h |
| `GET /api/hot-players` | Trending players | 60s |
| `GET /api/search?q=` | Player search | 5m |
| `GET /api/teams/[abbr]` | Team roster + aggregates | 2m |
| `GET /api/teams/season` | Official season stats + W/L | 1h |
| `GET /api/health` | System health check | no-cache |
| `GET /api/cron` | Data ingestion (cron only) | — |
| `GET /api/test-nba` | Manual data seed | — |

---

## Health monitoring

Set up a free monitor at uptimerobot.com pointing to `/api/health` every 5 minutes. Returns HTTP 200 when healthy, 503 when down.

---

## Pages

| Route | Description |
|-------|-------------|
| `/games` | Home — today's games, signal feed, following |
| `/games/[id]` | Game detail — score, momentum, box score |
| `/players/[id]` | Player profile — chart, stats, game log |
| `/teams/[abbr]` | Team page — record, roster, season stats |
| `/hot` | Trending players — ranked by performance |
