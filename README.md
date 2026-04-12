# 🎱 Marble Jar

**Accountability, punk style.** A tactile, social web app where friend groups track daily goals (workouts, meditation, custom habits) and earn marbles in a shared jar. When the jar is full, everyone gets the treat.

---

## What Is This?

Marble Jar replaces the "did you work out today?" group text with something more interesting. Your group picks a daily goal, picks a treat, and starts filling a jar. Each person gets one marble per day when they complete their goal — but nothing self-certifies. Activities are either auto-tracked via Strava or confirmed by a witness in the group.

An AI agent (powered by Claude) manages the group's energy — sending personalized nudges, celebrating milestones, and keeping things weird. The agent has a personality engine that uses each group's cultural favorites (shows, books, music) as its vocabulary, so every message feels specific to your friend group.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js (App Router, TypeScript) |
| Database | Supabase (Postgres) + Prisma ORM |
| Auth | Supabase Auth (magic link) |
| Styling | Tailwind CSS v4 + Framer Motion |
| AI Agent | Anthropic Claude (tool-use SDK) |
| SMS | Twilio (inbound/outbound) |
| Fitness | Strava API (OAuth + webhooks) |
| Images | Unsplash API |

## Features

### ✅ Core Loop
- **Marble minting** — One marble per user per day per jar. Enforced at the database level.
- **Witness mechanic** — SMS-logged activities require witness confirmation via one-tap SMS link. Strava activities auto-confirm.
- **Strava integration** — OAuth connect, webhook auto-minting, token refresh.
- **Glass marble rendering** — 3D radial gradients with highlights and depth.
- **Spring physics animations** — Framer Motion springs (stiffness 300, damping 20) for marble drops.

### 🤖 Agent System
- **SMS Intake Agent** — Claude tool-use loop with 9 tools. Handles activity logging, buddy notifications, and conversational replies.
- **Personality Engine** — MBT-informed soul document, astrology-driven mood (internal only), reactive mood based on group activity patterns.
- **Favorites Pot** — Agent uses each member's cultural favorites (shows, books, poets, music) as vocabulary.
- **Contrast Library** — 8 bad/good message pair examples that teach the agent the difference between generic AI slop and genuine mentalizing.
- **Goal-Setting Agent** — Analyzes Strava history, proposes realistic group goals, facilitates approval flow.
- **Weekly Hype Agent** — Cron-triggered Monday check-ins with per-jar personalized messages.

### 📱 Screens
- **Dashboard** — Group overview with jar fill percentages
- **Jar Detail** — Marble visualization, member stats, streaks, celebration overlay
- **Feed** — Chronological marble drops + agent posts with emoji reactions
- **Profile** — Glass marble preview, stats (total/streaks/best), connected accounts
- **Jar Settings** — Treat, goal with approval status, invite link, member list
- **Onboarding** — 6-step flow: auth → marble picker → phone → Strava → group → jars
- **Witness Confirm** — One-tap `/confirm/[token]` page for SMS verification
- **Celebration** — Full-screen confetti with treat reveal when jar fills up

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (with Postgres)
- Accounts: Anthropic, Twilio, Strava, Unsplash

### Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url

# Strava
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_VERIFY_TOKEN=your_verify_token

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# AI
ANTHROPIC_API_KEY=your_api_key

# Images
UNSPLASH_ACCESS_KEY=your_access_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your_cron_secret
```

### Install & Run

```bash
npm install
npx prisma db push    # Apply schema to database
npx prisma db seed    # Seed demo data (4 users, 2 jars, ~40 marbles)
npm run dev           # Start dev server at localhost:3000
```

### Cron Setup (Weekly Hype)

For Vercel deployment, add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/agents/weekly-hype",
    "schedule": "0 13 * * 1"
  }]
}
```

This triggers every Monday at 8am ET (1pm UTC).

## Architecture

```
src/
├── app/
│   ├── (app)/          ← Authenticated pages (dashboard, jar, feed, profile)
│   ├── (auth)/         ← Login + auth callback
│   ├── api/
│   │   ├── agents/     ← Goal-setting, weekly hype, goal approval
│   │   ├── feed/       ← Reaction toggle
│   │   ├── onboarding/ ← 6-step onboarding API
│   │   ├── sms/        ← Twilio webhook → intake agent
│   │   └── strava/     ← OAuth + activity webhook
│   └── confirm/        ← One-tap witness confirmation
├── components/
│   ├── feed/           ← ReactionBar (client, optimistic updates)
│   ├── jar/            ← Jar shell, MarbleViz, Celebration, GoalActions
│   ├── marble/         ← Glass marble + drop animation
│   └── ui/             ← BottomNav, InkInput, PaperCard, ZineButton, etc.
└── lib/
    ├── agents/
    │   ├── contrasts.ts     ← Bad/good message examples
    │   ├── goal-setting.ts  ← Goal agent (Claude tool-use loop)
    │   ├── intake.ts        ← SMS agent (Claude tool-use loop)
    │   ├── personality.ts   ← Mood, astrology, favorites, context builder
    │   ├── soul.ts          ← MBT agent personality document
    │   ├── weekly-hype.ts   ← Monday check-in agent
    │   └── tools/           ← Tool implementations (marble, SMS, favorites, witness, goals)
    ├── db.ts                ← Prisma client
    ├── strava.ts            ← OAuth + API
    ├── supabase/            ← Client/server/middleware helpers
    ├── timezone.ts          ← Day-date utility
    └── twilio.ts            ← SMS send + signature validation
```

## Design System

The app uses a "punk zine" aesthetic:
- **Fonts**: Permanent Marker (headers), Special Elite (typewriter body), Archivo Black (labels), Courier Prime (mono)
- **Colors**: Kraft paper backgrounds, ink black, punk pink accents
- **Effects**: Tape dividers, paper cards with rotation, ransom-note text, hard shadows
- **Marbles**: CSS radial gradients creating glass-like 3D depth with highlights and shadows

## License

MIT
