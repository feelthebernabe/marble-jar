# Marble Jar Foundation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of Marble Jar — project scaffold, database, auth, onboarding flow, group/jar creation, and the animated jar visualization in collage-zine style.

**Architecture:** Next.js app router on Vercel with Supabase for auth (magic link) and Postgres via Prisma. The app is structured around route groups: `(auth)` for login/signup, `(app)` for authenticated pages. Onboarding is a multi-step flow storing progress in URL params. The jar visualization uses Framer Motion with spring physics for marble drops, rendered in a cut-and-paste collage zine aesthetic.

**Tech Stack:** Next.js 15 (app router, TypeScript), Supabase (auth), Prisma (ORM), Framer Motion, Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-04-06-marble-jar-design.md`

**Scope:** This is Plan 1 of 4. Covers build steps 1-4 from the spec (scaffold, database, onboarding, jar visualization). Does NOT include Strava, Twilio, agents, or SMS — those are Plans 2-4.

---

## File Structure

```
/marble-jar
  package.json
  tailwind.config.ts
  next.config.ts
  tsconfig.json
  .env.local                              — environment variables (gitignored)
  .gitignore

  /prisma
    schema.prisma                          — full data model from spec

  /src
    /lib
      db.ts                                — Prisma client singleton
      supabase/
        server.ts                          — Supabase server client (cookies)
        client.ts                          — Supabase browser client
        middleware.ts                       — Auth session refresh logic

    /app
      layout.tsx                           — Root layout (fonts, providers)
      middleware.ts                         — Next.js middleware (auth redirect)
      globals.css                           — Tailwind + zine custom styles

      /(auth)
        /login/page.tsx                    — Magic link login
        /auth/callback/route.ts            — Supabase auth callback handler

      /(app)
        layout.tsx                         — Authenticated layout (nav, auth guard)
        /dashboard/page.tsx                — Home: groups + jars overview
        /onboarding/
          layout.tsx                       — Onboarding shell (progress indicator)
          /marble/page.tsx                 — Pick color + symbol
          /phone/page.tsx                  — Add phone number
          /favorites/page.tsx              — Add movies, books, etc.
          /group/page.tsx                  — Create or join a group
          /jars/page.tsx                   — Bundle jars, set treats + targets
        /jar/[id]/page.tsx                 — Jar view with animated marbles
        /group/[id]/page.tsx               — Group overview

    /components
      /ui
        paper-card.tsx                     — Torn-paper-edge container
        washi-tape.tsx                     — Washi tape decorative element
        zine-button.tsx                    — Thick ink border button
        ink-input.tsx                      — Styled input field
        progress-dots.tsx                  — Onboarding step indicator
      /marble
        marble.tsx                         — Single marble component (color + symbol)
        marble-drop.tsx                    — Animated marble with Framer Motion spring
      /jar
        jar.tsx                            — The glass jar container (collage style)
        jar-with-marbles.tsx               — Jar + positioned marbles inside
        jar-fill-indicator.tsx             — Visual fill level
      /onboarding
        color-picker.tsx                   — Curated jewel tone palette grid
        symbol-picker.tsx                  — Icon grid for marble symbols
        favorites-form.tsx                 — Add favorites by category

  /tests
    /components
      marble.test.tsx
      jar.test.tsx
    /lib
      db.test.ts
    /app
      onboarding.test.tsx
```

---

## Chunk 1: Project Scaffold & Database

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.gitignore`, `.env.local`

- [ ] **Step 1: Create Next.js app with TypeScript and Tailwind**

```bash
cd "/Users/michelle/Vibe Projects/marble jar"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Select defaults when prompted. This creates the scaffold with app router and src directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr prisma @prisma/client framer-motion
npm install -D @types/node
```

- [ ] **Step 3: Initialize Prisma**

```bash
npx prisma init
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env`.

- [ ] **Step 4: Set up .env.local**

Create `.env.local` with placeholder values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_url
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 5: Update .gitignore**

Add to `.gitignore`:
```
.env.local
.env
.superpowers/
```

- [ ] **Step 6: Initialize git repo and commit**

```bash
git init
git add -A
git commit -m "feat: initialize Next.js project with TypeScript, Tailwind, Prisma, Framer Motion"
```

---

### Task 2: Prisma Schema

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Write the full Prisma schema**

Replace the contents of `prisma/schema.prisma` with the complete schema from the spec. This includes all models: User, Group, GroupMember, Jar, Marble, Activity, GoalApproval, FeedPost, BuddyNotification, Favorite, AgentMemory, RetryQueue, and all enums (JarCategory, JarStatus, ActivityStatus).

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String
  phone           String   @unique
  timezone        String   @default("America/Los_Angeles")
  marbleColor     String?
  marbleSymbol    String?
  stravaToken     String?
  stravaRefresh   String?
  stravaAthleteId String?
  onboardingStep  Int      @default(0)
  createdAt       DateTime @default(now())

  createdGroups      Group[]            @relation("groupCreator")
  groupMembers       GroupMember[]
  marbles            Marble[]
  activities         Activity[]
  buddyNotifications BuddyNotification[]
  favorites          Favorite[]
  goalApprovals      GoalApproval[]
  feedPosts          FeedPost[]
}

model Group {
  id          String   @id @default(cuid())
  name        String
  inviteCode  String   @unique
  createdById String
  createdAt   DateTime @default(now())

  createdBy     User          @relation("groupCreator", fields: [createdById], references: [id])
  jars          Jar[]
  members       GroupMember[]
  agentMemories AgentMemory[]
}

model GroupMember {
  id       String   @id @default(cuid())
  groupId  String
  userId   String
  joinedAt DateTime @default(now())

  group Group @relation(fields: [groupId], references: [id])
  user  User  @relation(fields: [userId], references: [id])

  @@unique([groupId, userId])
}

model Jar {
  id               String    @id @default(cuid())
  groupId          String
  category         JarCategory
  status           JarStatus   @default(PENDING)
  goalDescription  String?
  treatDescription String
  capacity         Int
  createdAt        DateTime    @default(now())
  completedAt      DateTime?

  group         Group          @relation(fields: [groupId], references: [id])
  marbles       Marble[]
  activities    Activity[]
  goalApprovals GoalApproval[]
  feedPosts     FeedPost[]
}

enum JarCategory {
  WORKOUT
  MEDITATION
  CUSTOM
}

enum JarStatus {
  PENDING
  GOAL_SETTING
  ACTIVE
  COMPLETE
}

model Marble {
  id       String   @id @default(cuid())
  jarId    String
  userId   String
  earnedAt DateTime @default(now())
  dayDate  String
  source   String

  jar  Jar  @relation(fields: [jarId], references: [id])
  user User @relation(fields: [userId], references: [id])

  @@unique([jarId, userId, dayDate])
}

model Activity {
  id               String         @id @default(cuid())
  userId           String
  jarId            String
  source           String
  status           ActivityStatus @default(CONFIRMED)
  description      String?
  loggedAt         DateTime       @default(now())
  stravaActivityId String?        @unique

  user              User               @relation(fields: [userId], references: [id])
  jar               Jar                @relation(fields: [jarId], references: [id])
  buddyNotification BuddyNotification?
}

enum ActivityStatus {
  CONFIRMED
}

model GoalApproval {
  id         String    @id @default(cuid())
  jarId      String
  userId     String
  approved   Boolean   @default(false)
  approvedAt DateTime?

  jar  Jar  @relation(fields: [jarId], references: [id])
  user User @relation(fields: [userId], references: [id])

  @@unique([jarId, userId])
}

model FeedPost {
  id        String   @id @default(cuid())
  jarId     String
  userId    String?
  type      String
  content   String
  mediaUrl  String?
  createdAt DateTime @default(now())

  jar  Jar   @relation(fields: [jarId], references: [id])
  user User? @relation(fields: [userId], references: [id])
}

model BuddyNotification {
  id         String   @id @default(cuid())
  activityId String   @unique
  buddyId    String
  message    String
  mediaUrl   String?
  sentAt     DateTime @default(now())

  activity Activity @relation(fields: [activityId], references: [id])
  buddy    User     @relation(fields: [buddyId], references: [id])
}

model Favorite {
  id       String   @id @default(cuid())
  userId   String
  category String
  value    String
  addedAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}

model AgentMemory {
  id        String   @id @default(cuid())
  groupId   String
  type      String
  content   String
  createdAt DateTime @default(now())

  group Group @relation(fields: [groupId], references: [id])
}

model RetryQueue {
  id          String   @id @default(cuid())
  type        String
  payload     Json
  attempts    Int      @default(0)
  maxAttempts Int      @default(3)
  nextRetryAt DateTime
  createdAt   DateTime @default(now())
}
```

- [ ] **Step 2: Run Prisma migration**

Ensure `DATABASE_URL` in `.env` points to your Supabase Postgres connection string (find it in Supabase dashboard → Settings → Database → Connection string → URI).

```bash
npx prisma migrate dev --name init
```

Expected: Migration creates all tables. Prisma Client is generated.

- [ ] **Step 3: Verify by opening Prisma Studio**

```bash
npx prisma studio
```

Expected: Opens in browser showing all tables. Verify they exist and have correct columns.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add complete Prisma schema with all models and enums"
```

---

### Task 3: Prisma Client Singleton

**Files:**
- Create: `src/lib/db.ts`

- [ ] **Step 1: Create Prisma client singleton**

```typescript
// src/lib/db.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add Prisma client singleton"
```

---

### Task 4: Supabase Auth Setup

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`
- Create: `src/app/middleware.ts`

- [ ] **Step 1: Create Supabase browser client**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Create Supabase server client**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 3: Create Supabase middleware helper**

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to login (except for auth pages)
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

- [ ] **Step 4: Create Next.js middleware**

```typescript
// src/middleware.ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/ src/middleware.ts
git commit -m "feat: add Supabase auth with server/client/middleware setup"
```

---

### Task 5: Seed Script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add seed script)

- [ ] **Step 1: Create seed script with test data**

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.feedPost.deleteMany();
  await prisma.buddyNotification.deleteMany();
  await prisma.marble.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.goalApproval.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.agentMemory.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.jar.deleteMany();
  await prisma.group.deleteMany();
  await prisma.retryQueue.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const michelle = await prisma.user.create({
    data: {
      email: "michelle@example.com",
      name: "Michelle",
      phone: "+15551234567",
      marbleColor: "#e53935",
      marbleSymbol: "star",
      onboardingStep: 7,
    },
  });

  const elli = await prisma.user.create({
    data: {
      email: "elli@example.com",
      name: "Elli",
      phone: "+15559876543",
      marbleColor: "#1565c0",
      marbleSymbol: "moon",
      onboardingStep: 7,
    },
  });

  const jake = await prisma.user.create({
    data: {
      email: "jake@example.com",
      name: "Jake",
      phone: "+15555551234",
      marbleColor: "#2e7d32",
      marbleSymbol: "lightning",
      onboardingStep: 7,
    },
  });

  const sarah = await prisma.user.create({
    data: {
      email: "sarah@example.com",
      name: "Sarah",
      phone: "+15555554321",
      marbleColor: "#8e24aa",
      marbleSymbol: "flame",
      onboardingStep: 7,
    },
  });

  // Create group
  const group = await prisma.group.create({
    data: {
      name: "Michelle & Friends",
      inviteCode: "marble-crew-2026",
      createdById: michelle.id,
    },
  });

  // Add members
  for (const user of [michelle, elli, jake, sarah]) {
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: user.id },
    });
  }

  // Create workout jar (ACTIVE)
  const workoutJar = await prisma.jar.create({
    data: {
      groupId: group.id,
      category: "WORKOUT",
      status: "ACTIVE",
      goalDescription: "1 workout per day",
      treatDescription: "Group dinner at that new ramen place",
      capacity: 60,
    },
  });

  // Create meditation jar (ACTIVE)
  const meditationJar = await prisma.jar.create({
    data: {
      groupId: group.id,
      category: "MEDITATION",
      status: "ACTIVE",
      goalDescription: "10 minutes meditation",
      treatDescription: "Spa day",
      capacity: 40,
    },
  });

  // Add some marbles to workout jar (spread over last 2 weeks)
  const users = [michelle, elli, jake, sarah];
  const today = new Date();

  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const dayDate = date.toISOString().split("T")[0];

    // Each user has ~70% chance of logging each day
    for (const user of users) {
      if (Math.random() < 0.7) {
        await prisma.marble.create({
          data: {
            jarId: workoutJar.id,
            userId: user.id,
            dayDate,
            source: "sms",
            earnedAt: date,
          },
        });
      }
    }
  }

  // Add fewer marbles to meditation jar
  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const dayDate = date.toISOString().split("T")[0];

    for (const user of users) {
      if (Math.random() < 0.5) {
        await prisma.marble.create({
          data: {
            jarId: meditationJar.id,
            userId: user.id,
            dayDate,
            source: "sms",
            earnedAt: date,
          },
        });
      }
    }
  }

  // Add favorites
  const favorites = [
    { userId: michelle.id, category: "show", value: "Succession" },
    { userId: michelle.id, category: "poet", value: "Mary Oliver" },
    { userId: michelle.id, category: "movie", value: "Spirited Away" },
    { userId: elli.id, category: "show", value: "Seinfeld" },
    { userId: elli.id, category: "book", value: "Educated by Tara Westover" },
    { userId: jake.id, category: "movie", value: "Rocky" },
    { userId: jake.id, category: "music", value: "Kendrick Lamar" },
    { userId: sarah.id, category: "poet", value: "Rumi" },
    { userId: sarah.id, category: "show", value: "The Office" },
  ];

  for (const fav of favorites) {
    await prisma.favorite.create({ data: fav });
  }

  const workoutCount = await prisma.marble.count({
    where: { jarId: workoutJar.id },
  });
  const meditationCount = await prisma.marble.count({
    where: { jarId: meditationJar.id },
  });

  console.log(`Seeded: 4 users, 1 group, 2 jars`);
  console.log(`Workout jar: ${workoutCount}/${workoutJar.capacity} marbles`);
  console.log(
    `Meditation jar: ${meditationCount}/${meditationJar.capacity} marbles`
  );
  console.log(`9 favorites added`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 2: Add seed config to package.json**

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

Install tsx: `npm install -D tsx`

- [ ] **Step 3: Run seed**

```bash
npx prisma db seed
```

Expected: Output showing 4 users, 1 group, 2 jars, and marble counts.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add seed script with test data for 4 users, 2 jars"
```

---

## Chunk 2: Zine Design System & Global Styles

### Task 6: Global Styles & Zine CSS

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Set up global CSS with zine design tokens**

Replace `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  /* Zine paper backgrounds */
  --color-paper: #f5f0e6;
  --color-paper-dark: #ede7db;
  --color-paper-warm: #faf3e8;

  /* Ink */
  --color-ink: #1a1a1a;
  --color-ink-light: #3a3a3a;
  --color-ink-faint: #8a8a7a;

  /* Jewel tone marble palette */
  --color-marble-red: #d94040;
  --color-marble-blue: #2b6cb0;
  --color-marble-green: #2f855a;
  --color-marble-purple: #805ad5;
  --color-marble-gold: #d69e2e;
  --color-marble-pink: #d53f8c;
  --color-marble-teal: #319795;
  --color-marble-orange: #c05621;

  /* Fonts */
  --font-body: "Georgia", "Times New Roman", serif;
  --font-hand: "Caveat", cursive;

  /* Zine borders */
  --border-ink: 2.5px solid var(--color-ink);
  --shadow-hard: 3px 3px 0 var(--color-ink);
  --shadow-hard-sm: 2px 2px 0 var(--color-ink);
}

body {
  font-family: var(--font-body);
  background-color: var(--color-paper);
  color: var(--color-ink);
}

/* Torn paper edge effect via clip-path */
.torn-edge {
  clip-path: polygon(
    0% 2%, 4% 0%, 8% 1%, 12% 0%, 16% 2%, 20% 0%, 24% 1%,
    28% 0%, 32% 2%, 36% 0%, 40% 1%, 44% 0%, 48% 2%, 52% 0%,
    56% 1%, 60% 0%, 64% 2%, 68% 0%, 72% 1%, 76% 0%, 80% 2%,
    84% 0%, 88% 1%, 92% 0%, 96% 2%, 100% 0%,
    100% 98%, 96% 100%, 92% 99%, 88% 100%, 84% 98%, 80% 100%,
    76% 99%, 72% 100%, 68% 98%, 64% 100%, 60% 99%, 56% 100%,
    52% 98%, 48% 100%, 44% 99%, 40% 100%, 36% 98%, 32% 100%,
    28% 99%, 24% 100%, 20% 98%, 16% 100%, 12% 99%, 8% 100%,
    4% 98%, 0% 100%
  );
}

/* Cross-hatch background pattern */
.cross-hatch {
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 4px,
      rgba(0, 0, 0, 0.03) 4px,
      rgba(0, 0, 0, 0.03) 5px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      rgba(0, 0, 0, 0.03) 4px,
      rgba(0, 0, 0, 0.03) 5px
    );
}
```

- [ ] **Step 2: Update root layout with fonts**

```typescript
// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marble Jar",
  description: "Fill the jar together, earn the treat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify dev server runs**

```bash
npm run dev
```

Expected: App loads at localhost:3000 with warm paper background and serif font.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: add zine design system — paper textures, ink borders, jewel tones"
```

---

### Task 7: Zine UI Primitives

**Files:**
- Create: `src/components/ui/paper-card.tsx`
- Create: `src/components/ui/washi-tape.tsx`
- Create: `src/components/ui/zine-button.tsx`
- Create: `src/components/ui/ink-input.tsx`

- [ ] **Step 1: Create PaperCard component**

```typescript
// src/components/ui/paper-card.tsx
"use client";

import { type ReactNode } from "react";

interface PaperCardProps {
  children: ReactNode;
  className?: string;
  rotate?: number; // slight rotation in degrees
}

export function PaperCard({
  children,
  className = "",
  rotate = 0,
}: PaperCardProps) {
  return (
    <div
      className={`relative bg-paper-warm border-[2.5px] border-ink shadow-[3px_3px_0_#1a1a1a] ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create WashiTape component**

```typescript
// src/components/ui/washi-tape.tsx
interface WashiTapeProps {
  color?: string;
  className?: string;
  rotate?: number;
}

const TAPE_PATTERNS: Record<string, string> = {
  pink: "repeating-linear-gradient(90deg, #e8b4b8 0px, #e8b4b8 6px, #ecc5c8 6px, #ecc5c8 12px)",
  yellow:
    "repeating-linear-gradient(90deg, #f0d68a 0px, #f0d68a 6px, #f5e2a8 6px, #f5e2a8 12px)",
  blue: "repeating-linear-gradient(90deg, #a8c4d8 0px, #a8c4d8 6px, #bdd4e4 6px, #bdd4e4 12px)",
  green:
    "repeating-linear-gradient(90deg, #a8d5ba 0px, #a8d5ba 6px, #bfe0cc 6px, #bfe0cc 12px)",
};

export function WashiTape({
  color = "pink",
  className = "",
  rotate = -1,
}: WashiTapeProps) {
  return (
    <div
      className={`h-5 border border-ink/30 ${className}`}
      style={{
        background: TAPE_PATTERNS[color] || TAPE_PATTERNS.pink,
        transform: `rotate(${rotate}deg)`,
      }}
    />
  );
}
```

- [ ] **Step 3: Create ZineButton component**

```typescript
// src/components/ui/zine-button.tsx
"use client";

import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ZineButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary";
}

export function ZineButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: ZineButtonProps) {
  const base =
    "px-6 py-3 border-[2.5px] border-ink font-bold text-lg transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer";
  const variants = {
    primary:
      "bg-ink text-paper-warm shadow-[3px_3px_0_#3a3a3a] hover:shadow-[4px_4px_0_#3a3a3a]",
    secondary:
      "bg-paper-warm text-ink shadow-[3px_3px_0_#1a1a1a] hover:shadow-[4px_4px_0_#1a1a1a]",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      style={{ transform: "rotate(-0.5deg)" }}
      {...props}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Create InkInput component**

```typescript
// src/components/ui/ink-input.tsx
"use client";

import { type InputHTMLAttributes } from "react";

interface InkInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function InkInput({ label, className = "", ...props }: InkInputProps) {
  return (
    <div className="space-y-1">
      <label
        className="block text-sm font-bold uppercase tracking-wider text-ink-light"
        style={{ fontFamily: "var(--font-hand)", fontSize: "1.1rem" }}
      >
        {label}
      </label>
      <input
        className={`w-full px-4 py-3 bg-paper-warm border-[2.5px] border-ink shadow-[2px_2px_0_#1a1a1a] text-ink placeholder:text-ink-faint focus:outline-none focus:shadow-[3px_3px_0_#1a1a1a] transition-shadow ${className}`}
        {...props}
      />
    </div>
  );
}
```

- [ ] **Step 5: Verify components render**

Create a temporary test page at `src/app/page.tsx`:

```typescript
import { PaperCard } from "@/components/ui/paper-card";
import { WashiTape } from "@/components/ui/washi-tape";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";

export default function Home() {
  return (
    <div className="max-w-lg mx-auto p-8 space-y-8">
      <h1
        className="text-4xl font-bold"
        style={{ fontFamily: "var(--font-hand)" }}
      >
        Marble Jar
      </h1>
      <WashiTape color="pink" />
      <PaperCard className="p-6" rotate={-0.5}>
        <h2 className="text-xl font-bold mb-2">A Paper Card</h2>
        <p>Torn paper edges, hard shadows, ink borders.</p>
      </PaperCard>
      <InkInput label="Your name" placeholder="Type here..." />
      <div className="flex gap-4">
        <ZineButton>Primary</ZineButton>
        <ZineButton variant="secondary">Secondary</ZineButton>
      </div>
    </div>
  );
}
```

Run `npm run dev` and check localhost:3000. Verify: paper texture background, thick borders, hard drop shadows, washi tape stripe, handwritten font for headings.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add zine UI primitives — PaperCard, WashiTape, ZineButton, InkInput"
```

---

## Chunk 3: Auth & Login

### Task 8: Login Page

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/auth/callback/route.ts`

- [ ] **Step 1: Create magic link login page**

```typescript
// src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";
import { WashiTape } from "@/components/ui/washi-tape";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-paper">
      <div className="w-full max-w-md">
        <h1
          className="text-5xl font-bold text-center mb-2"
          style={{
            fontFamily: "var(--font-hand)",
            transform: "rotate(-2deg)",
          }}
        >
          marble jar
        </h1>
        <p className="text-center text-ink-light mb-8 text-lg">
          fill the jar together, earn the treat
        </p>

        <WashiTape color="yellow" className="w-32 mx-auto mb-6" rotate={-1} />

        <PaperCard className="p-8" rotate={0.5}>
          {sent ? (
            <div className="text-center space-y-4">
              <p
                className="text-2xl"
                style={{ fontFamily: "var(--font-hand)" }}
              >
                check your email!
              </p>
              <p className="text-ink-light">
                We sent a magic link to <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <InkInput
                label="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && (
                <p className="text-marble-red text-sm font-bold">{error}</p>
              )}
              <ZineButton type="submit" className="w-full">
                send magic link
              </ZineButton>
            </form>
          )}
        </PaperCard>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create auth callback handler**

```typescript
// src/app/(auth)/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user exists in our DB, if not redirect to onboarding
      return NextResponse.redirect(`${origin}/onboarding/marble`);
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
```

- [ ] **Step 3: Verify login flow**

Ensure Supabase project has magic link auth enabled (it is by default). Run `npm run dev`, go to `/login`, enter an email. Verify:
- Magic link email is sent
- Clicking the link redirects through `/auth/callback` to `/onboarding/marble`

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: add magic link login page with zine styling"
```

---

### Task 9: User Record Sync

**Files:**
- Modify: `src/app/(auth)/auth/callback/route.ts`

When a user authenticates via Supabase, we need to ensure they have a corresponding record in our Prisma `User` table.

- [ ] **Step 1: Update callback to create/find user in Prisma DB**

```typescript
// src/app/(auth)/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Find or create user in our database
      let user = await db.user.findUnique({
        where: { email: data.user.email! },
      });

      if (!user) {
        user = await db.user.create({
          data: {
            email: data.user.email!,
            name: "", // collected in onboarding
            phone: `pending_${data.user.id}`, // unique placeholder, real number set in onboarding
          },
        });
      }

      // Route based on onboarding progress
      if (user.onboardingStep >= 7) {
        return NextResponse.redirect(`${origin}/dashboard`);
      }

      const onboardingRoutes: Record<number, string> = {
        0: "/onboarding/marble",
        1: "/onboarding/marble",
        2: "/onboarding/phone",
        3: "/onboarding/favorites",
        4: "/onboarding/group",
        5: "/onboarding/jars",
        6: "/onboarding/jars",
      };

      const route = onboardingRoutes[user.onboardingStep] || "/onboarding/marble";
      return NextResponse.redirect(`${origin}${route}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(auth\)/auth/callback/route.ts
git commit -m "feat: sync Supabase auth to Prisma user record with onboarding routing"
```

---

## Chunk 4: Onboarding Flow

### Task 10: Onboarding Layout & Progress

**Files:**
- Create: `src/app/(app)/onboarding/layout.tsx`
- Create: `src/components/ui/progress-dots.tsx`

- [ ] **Step 1: Create progress dots component**

```typescript
// src/components/ui/progress-dots.tsx
interface ProgressDotsProps {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full border-2 border-ink transition-all ${
            i < current
              ? "bg-ink"
              : i === current
                ? "bg-ink/50"
                : "bg-transparent"
          }`}
          style={{ transform: `rotate(${(i - 2) * 5}deg)` }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create onboarding layout**

```typescript
// src/app/(app)/onboarding/layout.tsx
import { ProgressDots } from "@/components/ui/progress-dots";
import { WashiTape } from "@/components/ui/washi-tape";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper p-4">
      <div className="max-w-lg mx-auto">
        <h1
          className="text-3xl font-bold text-center mt-8 mb-4"
          style={{
            fontFamily: "var(--font-hand)",
            transform: "rotate(-1deg)",
          }}
        >
          marble jar
        </h1>
        <WashiTape color="blue" className="w-24 mx-auto mb-8" />
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/onboarding/ src/components/ui/progress-dots.tsx
git commit -m "feat: add onboarding layout with progress dots"
```

---

### Task 11: Marble Picker (Color + Symbol)

**Files:**
- Create: `src/app/(app)/onboarding/marble/page.tsx`
- Create: `src/components/onboarding/color-picker.tsx`
- Create: `src/components/onboarding/symbol-picker.tsx`
- Create: `src/app/api/onboarding/marble/route.ts`

- [ ] **Step 1: Create color picker component**

```typescript
// src/components/onboarding/color-picker.tsx
"use client";

const MARBLE_COLORS = [
  { hex: "#d94040", name: "Ruby" },
  { hex: "#2b6cb0", name: "Sapphire" },
  { hex: "#2f855a", name: "Emerald" },
  { hex: "#805ad5", name: "Amethyst" },
  { hex: "#d69e2e", name: "Topaz" },
  { hex: "#d53f8c", name: "Rose" },
  { hex: "#319795", name: "Teal" },
  { hex: "#c05621", name: "Amber" },
];

interface ColorPickerProps {
  selected: string | null;
  onSelect: (hex: string) => void;
}

export function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {MARBLE_COLORS.map(({ hex, name }) => (
        <button
          key={hex}
          onClick={() => onSelect(hex)}
          className={`flex flex-col items-center gap-2 p-3 border-[2.5px] transition-all cursor-pointer ${
            selected === hex
              ? "border-ink shadow-[3px_3px_0_#1a1a1a] bg-paper-warm"
              : "border-transparent hover:border-ink/30"
          }`}
          style={{ transform: `rotate(${((i ?? 0) * 1.7 + 0.3) % 3 - 1.5}deg)` }}
        >
          <div
            className="w-12 h-12 rounded-full border-[2.5px] border-ink shadow-[2px_2px_0_#1a1a1a]"
            style={{
              background: `radial-gradient(circle at 38% 38%, ${hex}cc, ${hex})`,
            }}
          />
          <span
            className="text-xs font-bold"
            style={{ fontFamily: "var(--font-hand)", fontSize: "0.9rem" }}
          >
            {name}
          </span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create symbol picker component**

```typescript
// src/components/onboarding/symbol-picker.tsx
"use client";

const MARBLE_SYMBOLS = [
  { id: "star", icon: "★", label: "Star" },
  { id: "flame", icon: "🔥", label: "Flame" },
  { id: "lightning", icon: "⚡", label: "Lightning" },
  { id: "moon", icon: "☽", label: "Moon" },
  { id: "heart", icon: "♥", label: "Heart" },
  { id: "spiral", icon: "🌀", label: "Spiral" },
  { id: "diamond", icon: "◆", label: "Diamond" },
  { id: "leaf", icon: "🍃", label: "Leaf" },
];

interface SymbolPickerProps {
  selected: string | null;
  onSelect: (symbol: string) => void;
}

export function SymbolPicker({ selected, onSelect }: SymbolPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {MARBLE_SYMBOLS.map(({ id, icon, label }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`flex flex-col items-center gap-2 p-3 border-[2.5px] transition-all cursor-pointer ${
            selected === id
              ? "border-ink shadow-[3px_3px_0_#1a1a1a] bg-paper-warm"
              : "border-transparent hover:border-ink/30"
          }`}
          style={{ transform: `rotate(${((i ?? 0) * 1.7 + 0.3) % 3 - 1.5}deg)` }}
        >
          <span className="text-3xl">{icon}</span>
          <span
            className="text-xs font-bold"
            style={{ fontFamily: "var(--font-hand)", fontSize: "0.9rem" }}
          >
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create marble picker page**

```typescript
// src/app/(app)/onboarding/marble/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";
import { ProgressDots } from "@/components/ui/progress-dots";
import { ColorPicker } from "@/components/onboarding/color-picker";
import { SymbolPicker } from "@/components/onboarding/symbol-picker";

export default function MarblePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [step, setStep] = useState<"name" | "color" | "symbol">("name");

  async function handleSubmit() {
    if (!name || !color || !symbol) return;

    const res = await fetch("/api/onboarding/marble", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color, symbol }),
    });

    if (res.ok) {
      router.push("/onboarding/phone");
    }
  }

  return (
    <div className="space-y-6">
      <ProgressDots total={5} current={0} />

      {step === "name" ? (
        <PaperCard className="p-6" rotate={-0.4}>
          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            what's your name?
          </h2>
          <p className="text-ink-light mb-6">
            how your friends will see you in the jar.
          </p>
          <InkInput
            label="name"
            placeholder="your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {name.trim() && (
            <div className="mt-6 flex justify-end">
              <ZineButton onClick={() => setStep("color")}>
                next: pick a color
              </ZineButton>
            </div>
          )}
        </PaperCard>
      ) : step === "color" ? (
        <PaperCard className="p-6" rotate={-0.3}>
          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            pick your marble color
          </h2>
          <p className="text-ink-light mb-6">
            this is your color in every jar. choose wisely.
          </p>
          <ColorPicker selected={color} onSelect={setColor} />
          {color && (
            <div className="mt-6 flex justify-end">
              <ZineButton onClick={() => setStep("symbol")}>
                next: pick a symbol
              </ZineButton>
            </div>
          )}
        </PaperCard>
      ) : (
        <PaperCard className="p-6" rotate={0.3}>
          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            pick your symbol
          </h2>
          <p className="text-ink-light mb-6">
            this goes on every marble you earn.
          </p>
          <SymbolPicker selected={symbol} onSelect={setSymbol} />
          <div className="mt-6 flex justify-between">
            <ZineButton
              variant="secondary"
              onClick={() => setStep("color")}
            >
              back
            </ZineButton>
            {symbol && (
              <ZineButton onClick={handleSubmit}>
                next
              </ZineButton>
            )}
          </div>
        </PaperCard>
      )}

      {/* Marble preview */}
      {color && (
        <div className="flex justify-center">
          <div
            className="w-20 h-20 rounded-full border-[2.5px] border-ink shadow-[3px_3px_0_#1a1a1a] flex items-center justify-center text-3xl"
            style={{
              background: `radial-gradient(circle at 38% 38%, ${color}cc, ${color})`,
              transform: "rotate(-2deg)",
            }}
          >
            {symbol === "star" && "★"}
            {symbol === "flame" && "🔥"}
            {symbol === "lightning" && "⚡"}
            {symbol === "moon" && "☽"}
            {symbol === "heart" && "♥"}
            {symbol === "spiral" && "🌀"}
            {symbol === "diamond" && "◆"}
            {symbol === "leaf" && "🍃"}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create API route for saving marble choice**

```typescript
// src/app/api/onboarding/marble/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, color, symbol } = await request.json();

  if (!name || !color || !symbol) {
    return NextResponse.json(
      { error: "Name, color, and symbol required" },
      { status: 400 }
    );
  }

  await db.user.update({
    where: { email: authUser.email! },
    data: {
      name: name.trim(),
      marbleColor: color,
      marbleSymbol: symbol,
      onboardingStep: 2,
    },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Verify page renders and flow works**

Run `npm run dev`, navigate to `/onboarding/marble`. Verify:
- Color grid displays 8 jewel tones with zine styling
- Selecting a color shows the symbol step
- Marble preview updates live
- Submitting saves to DB and redirects to `/onboarding/phone`

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/onboarding/marble/ src/components/onboarding/ src/app/api/onboarding/
git commit -m "feat: add marble color + symbol picker with live preview"
```

---

### Task 12: Phone Number Step

**Files:**
- Create: `src/app/(app)/onboarding/phone/page.tsx`
- Create: `src/app/api/onboarding/phone/route.ts`

- [ ] **Step 1: Create phone number page**

```typescript
// src/app/(app)/onboarding/phone/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";
import { ProgressDots } from "@/components/ui/progress-dots";

export default function PhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/onboarding/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });

    if (res.ok) {
      router.push("/onboarding/favorites");
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <ProgressDots total={5} current={1} />

      <PaperCard className="p-6" rotate={0.4}>
        <h2
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-hand)" }}
        >
          add your phone number
        </h2>
        <p className="text-ink-light mb-6">
          this is how you'll log activities and get those sweet, sweet
          personalized texts from the marble jar agent.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <InkInput
            label="phone number"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          {error && (
            <p className="text-marble-red text-sm font-bold">{error}</p>
          )}
          <ZineButton type="submit" className="w-full">
            next
          </ZineButton>
        </form>
      </PaperCard>
    </div>
  );
}
```

- [ ] **Step 2: Create API route**

```typescript
// src/app/api/onboarding/phone/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone } = await request.json();

  if (!phone) {
    return NextResponse.json(
      { error: "Phone number required" },
      { status: 400 }
    );
  }

  // Simple phone normalization — strip non-digits except leading +
  const normalized = phone.startsWith("+")
    ? "+" + phone.slice(1).replace(/\D/g, "")
    : phone.replace(/\D/g, "");

  try {
    await db.user.update({
      where: { email: authUser.email! },
      data: {
        phone: normalized,
        onboardingStep: 3,
      },
    });
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      e.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "This phone number is already registered" },
        { status: 400 }
      );
    }
    throw e;
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/onboarding/phone/ src/app/api/onboarding/phone/
git commit -m "feat: add phone number onboarding step"
```

---

### Task 13: Favorites Step

**Files:**
- Create: `src/app/(app)/onboarding/favorites/page.tsx`
- Create: `src/components/onboarding/favorites-form.tsx`
- Create: `src/app/api/onboarding/favorites/route.ts`

- [ ] **Step 1: Create favorites form component**

```typescript
// src/components/onboarding/favorites-form.tsx
"use client";

import { useState } from "react";
import { InkInput } from "@/components/ui/ink-input";
import { ZineButton } from "@/components/ui/zine-button";

const CATEGORIES = [
  { id: "movie", label: "movies", emoji: "🎬" },
  { id: "show", label: "shows", emoji: "📺" },
  { id: "book", label: "books", emoji: "📚" },
  { id: "music", label: "music", emoji: "🎵" },
  { id: "poet", label: "poets", emoji: "✍️" },
];

interface FavoriteEntry {
  category: string;
  value: string;
}

interface FavoritesFormProps {
  onSubmit: (favorites: FavoriteEntry[]) => void;
}

export function FavoritesForm({ onSubmit }: FavoritesFormProps) {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState("movie");
  const [inputValue, setInputValue] = useState("");

  function addFavorite() {
    if (!inputValue.trim()) return;
    setFavorites([
      ...favorites,
      { category: activeCategory, value: inputValue.trim() },
    ]);
    setInputValue("");
  }

  function removeFavorite(index: number) {
    setFavorites(favorites.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(({ id, label, emoji }, ci) => (
          <button
            key={id}
            onClick={() => setActiveCategory(id)}
            className={`px-3 py-1.5 border-[2px] text-sm font-bold cursor-pointer ${
              activeCategory === id
                ? "border-ink bg-ink text-paper-warm shadow-[2px_2px_0_#3a3a3a]"
                : "border-ink/40 bg-paper-warm text-ink hover:border-ink"
            }`}
            style={{
              transform: `rotate(${(ci * 1.3) % 2 - 1}deg)`,
            }}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-3">
        <div className="flex-1">
          <InkInput
            label={`add a ${activeCategory}`}
            placeholder={`e.g. ${activeCategory === "movie" ? "Spirited Away" : activeCategory === "poet" ? "Mary Oliver" : "..."}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFavorite())}
          />
        </div>
        <div className="flex items-end">
          <ZineButton variant="secondary" onClick={addFavorite}>
            +
          </ZineButton>
        </div>
      </div>

      {/* Added favorites */}
      {favorites.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {favorites.map((fav, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-3 py-1 bg-paper-warm border-[2px] border-ink text-sm shadow-[2px_2px_0_#1a1a1a]"
              style={{
                transform: `rotate(${(i * 2.1 + 0.5) % 3 - 1.5}deg)`,
              }}
            >
              {CATEGORIES.find((c) => c.id === fav.category)?.emoji}{" "}
              {fav.value}
              <button
                onClick={() => removeFavorite(i)}
                className="ml-1 text-ink-faint hover:text-ink font-bold cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <ZineButton
        onClick={() => onSubmit(favorites)}
        className="w-full"
        disabled={favorites.length === 0}
      >
        {favorites.length === 0
          ? "add at least one favorite"
          : `continue with ${favorites.length} favorite${favorites.length === 1 ? "" : "s"}`}
      </ZineButton>
    </div>
  );
}
```

- [ ] **Step 2: Create favorites page**

```typescript
// src/app/(app)/onboarding/favorites/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { PaperCard } from "@/components/ui/paper-card";
import { ProgressDots } from "@/components/ui/progress-dots";
import { FavoritesForm } from "@/components/onboarding/favorites-form";

export default function FavoritesPage() {
  const router = useRouter();

  async function handleSubmit(
    favorites: { category: string; value: string }[]
  ) {
    const res = await fetch("/api/onboarding/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorites }),
    });

    if (res.ok) {
      router.push("/onboarding/group");
    }
  }

  return (
    <div className="space-y-6">
      <ProgressDots total={5} current={2} />

      <PaperCard className="p-6" rotate={-0.3}>
        <h2
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-hand)" }}
        >
          what do you love?
        </h2>
        <p className="text-ink-light mb-6">
          your favorites feed the marble jar agent's personality. it'll weave
          your movies, books, music, and poets into the texts it sends your
          friends. the more you add, the funnier and more personal it gets.
        </p>
        <FavoritesForm onSubmit={handleSubmit} />
      </PaperCard>
    </div>
  );
}
```

- [ ] **Step 3: Create API route**

```typescript
// src/app/api/onboarding/favorites/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { favorites } = await request.json();

  if (!Array.isArray(favorites) || favorites.length === 0) {
    return NextResponse.json(
      { error: "At least one favorite required" },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { email: authUser.email! },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Create all favorites in a transaction
  await db.$transaction([
    ...favorites.map((fav: { category: string; value: string }) =>
      db.favorite.create({
        data: {
          userId: user.id,
          category: fav.category,
          value: fav.value,
        },
      })
    ),
    db.user.update({
      where: { id: user.id },
      data: { onboardingStep: 4 },
    }),
  ]);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/onboarding/favorites/ src/components/onboarding/favorites-form.tsx src/app/api/onboarding/favorites/
git commit -m "feat: add favorites onboarding step with category tabs"
```

---

### Task 14: Group Creation / Join Step

**Files:**
- Create: `src/app/(app)/onboarding/group/page.tsx`
- Create: `src/app/api/onboarding/group/route.ts`
- Create: `src/app/api/onboarding/group/join/route.ts`

- [ ] **Step 1: Create group page**

```typescript
// src/app/(app)/onboarding/group/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";
import { ProgressDots } from "@/components/ui/progress-dots";
import { WashiTape } from "@/components/ui/washi-tape";

export default function GroupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/onboarding/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: groupName }),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/onboarding/jars?groupId=${data.groupId}`);
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong");
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/onboarding/group/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Invalid invite code");
    }
  }

  return (
    <div className="space-y-6">
      <ProgressDots total={5} current={3} />

      {mode === "choose" && (
        <PaperCard className="p-6" rotate={-0.3}>
          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            your crew
          </h2>
          <p className="text-ink-light mb-6">
            marble jar is a group thing. create a new crew or join one.
          </p>
          <div className="space-y-4">
            <ZineButton
              onClick={() => setMode("create")}
              className="w-full"
            >
              start a new group
            </ZineButton>
            <ZineButton
              variant="secondary"
              onClick={() => setMode("join")}
              className="w-full"
            >
              join with invite code
            </ZineButton>
          </div>
        </PaperCard>
      )}

      {mode === "create" && (
        <PaperCard className="p-6" rotate={0.3}>
          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            name your group
          </h2>
          <p className="text-ink-light mb-6">
            something your friends will recognize.
          </p>
          <form onSubmit={handleCreate} className="space-y-6">
            <InkInput
              label="group name"
              placeholder="The Accountability Crew"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
            {error && (
              <p className="text-marble-red text-sm font-bold">{error}</p>
            )}
            <div className="flex gap-3">
              <ZineButton
                type="button"
                variant="secondary"
                onClick={() => setMode("choose")}
              >
                back
              </ZineButton>
              <ZineButton type="submit" className="flex-1">
                create group
              </ZineButton>
            </div>
          </form>
        </PaperCard>
      )}

      {mode === "join" && (
        <PaperCard className="p-6" rotate={-0.4}>
          <h2
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            join a group
          </h2>
          <p className="text-ink-light mb-6">
            ask whoever invited you for the code.
          </p>
          <form onSubmit={handleJoin} className="space-y-6">
            <InkInput
              label="invite code"
              placeholder="marble-crew-2026"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
            />
            {error && (
              <p className="text-marble-red text-sm font-bold">{error}</p>
            )}
            <div className="flex gap-3">
              <ZineButton
                type="button"
                variant="secondary"
                onClick={() => setMode("choose")}
              >
                back
              </ZineButton>
              <ZineButton type="submit" className="flex-1">
                join
              </ZineButton>
            </div>
          </form>
        </PaperCard>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create group creation API route**

```typescript
// src/app/api/onboarding/group/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Group name required" },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { email: authUser.email! },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const inviteCode = randomBytes(4).toString("hex");

  const group = await db.$transaction(async (tx) => {
    const group = await tx.group.create({
      data: {
        name: name.trim(),
        inviteCode,
        createdById: user.id,
      },
    });

    await tx.groupMember.create({
      data: {
        groupId: group.id,
        userId: user.id,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { onboardingStep: 5 },
    });

    return group;
  });

  return NextResponse.json({ groupId: group.id, inviteCode });
}
```

- [ ] **Step 3: Create group join API route**

```typescript
// src/app/api/onboarding/group/join/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { inviteCode } = await request.json();

  if (!inviteCode?.trim()) {
    return NextResponse.json(
      { error: "Invite code required" },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { email: authUser.email! },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const group = await db.group.findUnique({
    where: { inviteCode: inviteCode.trim() },
  });

  if (!group) {
    return NextResponse.json(
      { error: "No group found with that code" },
      { status: 404 }
    );
  }

  // Check if already a member
  const existing = await db.groupMember.findUnique({
    where: {
      groupId_userId: { groupId: group.id, userId: user.id },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You're already in this group" },
      { status: 400 }
    );
  }

  await db.$transaction([
    db.groupMember.create({
      data: {
        groupId: group.id,
        userId: user.id,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: { onboardingStep: 7 },
    }),
  ]);

  return NextResponse.json({ groupId: group.id });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/onboarding/group/ src/app/api/onboarding/group/
git commit -m "feat: add group create/join onboarding step"
```

---

### Task 15: Jar Bundling Step

**Files:**
- Create: `src/app/(app)/onboarding/jars/page.tsx`
- Create: `src/app/api/onboarding/jars/route.ts`

- [ ] **Step 1: Create jar bundling page**

```typescript
// src/app/(app)/onboarding/jars/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PaperCard } from "@/components/ui/paper-card";
import { ZineButton } from "@/components/ui/zine-button";
import { InkInput } from "@/components/ui/ink-input";
import { ProgressDots } from "@/components/ui/progress-dots";
import { WashiTape } from "@/components/ui/washi-tape";

interface JarConfig {
  category: "WORKOUT" | "MEDITATION" | "CUSTOM";
  treatDescription: string;
  capacity: number;
  goalDescription: string;
}

const JAR_CATEGORIES = [
  {
    id: "WORKOUT" as const,
    label: "workout",
    emoji: "💪",
    desc: "Strava auto-tracks, or text what you did",
  },
  {
    id: "MEDITATION" as const,
    label: "meditation",
    emoji: "🧘",
    desc: "Text when you've sat",
  },
  {
    id: "CUSTOM" as const,
    label: "custom",
    emoji: "✨",
    desc: "Define your own daily goal",
  },
];

export default function JarsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const [jars, setJars] = useState<JarConfig[]>([]);
  const [adding, setAdding] = useState<JarConfig | null>(null);
  const [error, setError] = useState("");

  function startAddJar(category: JarConfig["category"]) {
    setAdding({
      category,
      treatDescription: "",
      capacity: 60,
      goalDescription: "",
    });
  }

  function confirmJar() {
    if (!adding || !adding.treatDescription) return;
    setJars([...jars, adding]);
    setAdding(null);
  }

  async function handleSubmit() {
    if (jars.length === 0 || !groupId) return;
    setError("");

    const res = await fetch("/api/onboarding/jars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, jars }),
    });

    if (res.ok) {
      router.push("/dashboard");
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <ProgressDots total={5} current={4} />

      <PaperCard className="p-6" rotate={-0.3}>
        <h2
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: "var(--font-hand)" }}
        >
          fill your jars
        </h2>
        <p className="text-ink-light mb-6">
          pick what your group commits to. each jar is a different daily goal
          with its own treat when you fill it up.
        </p>

        {/* Added jars */}
        {jars.map((jar, i) => (
          <div
            key={i}
            className="mb-4 p-4 border-[2.5px] border-ink bg-paper-warm shadow-[2px_2px_0_#1a1a1a]"
            style={{
              transform: `rotate(${(i % 2 === 0 ? -1 : 1) * 0.5}deg)`,
            }}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-lg font-bold">
                  {JAR_CATEGORIES.find((c) => c.id === jar.category)?.emoji}{" "}
                  {jar.category.toLowerCase()}
                </span>
                {jar.goalDescription && (
                  <p className="text-sm text-ink-light">
                    {jar.goalDescription}
                  </p>
                )}
                <p className="text-sm mt-1">
                  Treat: <strong>{jar.treatDescription}</strong>
                </p>
                <p className="text-sm text-ink-faint">
                  {jar.capacity} marbles to fill
                </p>
              </div>
              <button
                onClick={() => setJars(jars.filter((_, j) => j !== i))}
                className="text-ink-faint hover:text-ink font-bold text-xl cursor-pointer"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {/* Add jar UI */}
        {adding ? (
          <div className="p-4 border-[2px] border-dashed border-ink/50 space-y-4">
            <p className="font-bold">
              {JAR_CATEGORIES.find((c) => c.id === adding.category)?.emoji}{" "}
              {adding.category.toLowerCase()} jar
            </p>

            {adding.category === "CUSTOM" && (
              <InkInput
                label="daily goal"
                placeholder="e.g. read for 20 minutes"
                value={adding.goalDescription}
                onChange={(e) =>
                  setAdding({ ...adding, goalDescription: e.target.value })
                }
              />
            )}

            <InkInput
              label="the treat (what you earn when the jar is full)"
              placeholder="e.g. group dinner at that new ramen place"
              value={adding.treatDescription}
              onChange={(e) =>
                setAdding({ ...adding, treatDescription: e.target.value })
              }
            />

            <InkInput
              label="marble target"
              type="number"
              placeholder="60"
              value={String(adding.capacity)}
              onChange={(e) =>
                setAdding({
                  ...adding,
                  capacity: parseInt(e.target.value) || 60,
                })
              }
            />

            <div className="flex gap-3">
              <ZineButton
                variant="secondary"
                onClick={() => setAdding(null)}
              >
                cancel
              </ZineButton>
              <ZineButton onClick={confirmJar}>add jar</ZineButton>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <WashiTape color="green" className="w-20" rotate={-2} />
            <p
              className="text-lg font-bold"
              style={{ fontFamily: "var(--font-hand)" }}
            >
              add a jar:
            </p>
            <div className="flex flex-wrap gap-3">
              {JAR_CATEGORIES.map(({ id, label, emoji, desc }, ji) => (
                <button
                  key={id}
                  onClick={() => startAddJar(id)}
                  className="px-4 py-3 border-[2.5px] border-ink bg-paper-warm shadow-[2px_2px_0_#1a1a1a] hover:shadow-[3px_3px_0_#1a1a1a] transition-shadow text-left cursor-pointer"
                  style={{
                    transform: `rotate(${(ji * 1.4) % 2 - 1}deg)`,
                  }}
                >
                  <span className="font-bold">
                    {emoji} {label}
                  </span>
                  <p className="text-xs text-ink-light mt-1">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-marble-red text-sm font-bold mt-4">{error}</p>
        )}

        {jars.length > 0 && !adding && (
          <ZineButton onClick={handleSubmit} className="w-full mt-6">
            {`let's go — ${jars.length} jar${jars.length === 1 ? "" : "s"} ready`}
          </ZineButton>
        )}
      </PaperCard>
    </div>
  );
}
```

- [ ] **Step 2: Create jars API route**

```typescript
// src/app/api/onboarding/jars/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId, jars } = await request.json();

  if (!groupId || !Array.isArray(jars) || jars.length === 0) {
    return NextResponse.json(
      { error: "Group ID and at least one jar required" },
      { status: 400 }
    );
  }

  const user = await db.user.findUnique({
    where: { email: authUser.email! },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Verify user is a member of this group
  const membership = await db.groupMember.findUnique({
    where: {
      groupId_userId: { groupId, userId: user.id },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { error: "Not a member of this group" },
      { status: 403 }
    );
  }

  await db.$transaction([
    ...jars.map(
      (jar: {
        category: string;
        treatDescription: string;
        capacity: number;
        goalDescription?: string;
      }) =>
        db.jar.create({
          data: {
            groupId,
            category: jar.category as "WORKOUT" | "MEDITATION" | "CUSTOM",
            status: "PENDING",
            treatDescription: jar.treatDescription,
            capacity: jar.capacity,
            goalDescription: jar.goalDescription || null,
          },
        })
    ),
    db.user.update({
      where: { id: user.id },
      data: { onboardingStep: 7 },
    }),
  ]);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/onboarding/jars/ src/app/api/onboarding/jars/
git commit -m "feat: add jar bundling onboarding step with categories and treats"
```

---

## Chunk 5: Jar Visualization

### Task 16: Shared Constants

**Files:**
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Create shared marble constants**

```typescript
// src/lib/constants.ts
export const SYMBOL_MAP: Record<string, string> = {
  star: "★",
  flame: "🔥",
  lightning: "⚡",
  moon: "☽",
  heart: "♥",
  spiral: "🌀",
  diamond: "◆",
  leaf: "🍃",
};

export const MARBLE_COLORS = [
  { hex: "#d94040", name: "Ruby" },
  { hex: "#2b6cb0", name: "Sapphire" },
  { hex: "#2f855a", name: "Emerald" },
  { hex: "#805ad5", name: "Amethyst" },
  { hex: "#d69e2e", name: "Topaz" },
  { hex: "#d53f8c", name: "Rose" },
  { hex: "#319795", name: "Teal" },
  { hex: "#c05621", name: "Amber" },
] as const;

export const MARBLE_SYMBOLS = [
  { id: "star", label: "Star" },
  { id: "flame", label: "Flame" },
  { id: "lightning", label: "Lightning" },
  { id: "moon", label: "Moon" },
  { id: "heart", label: "Heart" },
  { id: "spiral", label: "Spiral" },
  { id: "diamond", label: "Diamond" },
  { id: "leaf", label: "Leaf" },
] as const;

export function getSymbolIcon(symbol: string): string {
  return SYMBOL_MAP[symbol] || "●";
}
```

All components that render marble symbols should import `getSymbolIcon` from this file instead of maintaining their own mapping. This includes: `marble.tsx`, `color-picker.tsx`, `symbol-picker.tsx`, the marble picker page, the jar view page, and the dashboard.

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add shared marble constants and symbol mapping"
```

---

### Task 17: Marble Component

**Files:**
- Create: `src/components/marble/marble.tsx`

- [ ] **Step 1: Create the marble component**

```typescript
// src/components/marble/marble.tsx
import { getSymbolIcon } from "@/lib/constants";

interface MarbleProps {
  color: string;
  symbol: string;
  size?: number; // px
  rotate?: number; // degrees
  className?: string;
}

export function Marble({
  color,
  symbol,
  size = 36,
  rotate = 0,
  className = "",
}: MarbleProps) {
  return (
    <div
      className={`rounded-full border-[2.5px] border-ink flex items-center justify-center shadow-[2px_2px_0_#1a1a1a] ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 38% 38%, ${color}cc, ${color})`,
        transform: `rotate(${rotate}deg)`,
        fontSize: size * 0.4,
      }}
    >
      {getSymbolIcon(symbol)}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/marble/marble.tsx
git commit -m "feat: add marble component with color gradient and symbol"
```

---

### Task 18: Animated Marble Drop

**Files:**
- Create: `src/components/marble/marble-drop.tsx`

- [ ] **Step 1: Create animated marble drop component**

```typescript
// src/components/marble/marble-drop.tsx
"use client";

import { motion } from "framer-motion";
import { Marble } from "./marble";

interface MarbleDropProps {
  color: string;
  symbol: string;
  size?: number;
  delay?: number; // stagger delay in seconds
  targetY: number; // final Y position inside the jar
  targetX: number; // final X position inside the jar
  rotate?: number;
  isNew?: boolean; // animate drop if true, static if false
}

export function MarbleDrop({
  color,
  symbol,
  size = 36,
  delay = 0,
  targetY,
  targetX,
  rotate = 0,
  isNew = false,
}: MarbleDropProps) {
  if (!isNew) {
    return (
      <div
        style={{
          position: "absolute",
          left: targetX,
          bottom: targetY,
        }}
      >
        <Marble color={color} symbol={symbol} size={size} rotate={rotate} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: -400, x: targetX, opacity: 0 }}
      animate={{
        y: 0,
        opacity: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay,
      }}
      style={{
        position: "absolute",
        left: targetX,
        bottom: targetY,
      }}
    >
      <Marble color={color} symbol={symbol} size={size} rotate={rotate} />
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/marble/marble-drop.tsx
git commit -m "feat: add animated marble drop with spring physics"
```

---

### Task 19: Jar Container (Collage Style)

**Files:**
- Create: `src/components/jar/jar.tsx`

- [ ] **Step 1: Create the collage-style jar container**

```typescript
// src/components/jar/jar.tsx
"use client";

import { type ReactNode } from "react";

interface JarProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function Jar({ children, label, className = "" }: JarProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Torn paper backing */}
      <div
        className="absolute inset-0 bg-paper-dark torn-edge"
        style={{ transform: "translate(4px, 4px) rotate(0.3deg)" }}
      />

      {/* Jar container */}
      <div className="relative">
        {/* Washi tape lid */}
        <div className="relative z-10 mx-auto" style={{ width: "70%" }}>
          <div
            className="h-5 border-[1.5px] border-ink"
            style={{
              background:
                "repeating-linear-gradient(90deg, #e8b4b8 0px, #e8b4b8 6px, #ecc5c8 6px, #ecc5c8 12px)",
              transform: "rotate(-0.5deg)",
            }}
          />
        </div>

        {/* Jar neck */}
        <div
          className="relative z-0 mx-auto border-[2.5px] border-ink border-b-0"
          style={{
            width: "55%",
            height: 40,
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.3), rgba(230,240,250,0.15))",
            borderRadius: "4px 4px 0 0",
          }}
        />

        {/* Jar body */}
        <div
          className="relative border-[3px] border-ink border-t-0 overflow-hidden"
          style={{
            borderRadius: "0 0 20px 20px",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(230,240,250,0.15))",
            minHeight: 300,
          }}
        >
          {/* Cross-hatch shadow on right side */}
          <div
            className="absolute right-0 top-0 w-8 h-full cross-hatch"
            style={{ opacity: 0.5 }}
          />

          {/* Glass reflection lines */}
          <div
            className="absolute top-4 left-3 w-[2px] rounded-full"
            style={{
              height: "60%",
              background: "rgba(255,255,255,0.4)",
              transform: "rotate(1deg)",
            }}
          />
          <div
            className="absolute top-8 left-6 w-[1.5px] rounded-full"
            style={{
              height: "40%",
              background: "rgba(255,255,255,0.25)",
            }}
          />

          {/* Marble container */}
          <div className="relative w-full h-full" style={{ minHeight: 300 }}>
            {children}
          </div>

          {/* Handwritten label */}
          {label && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-paper border-[1.5px] border-ink"
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "0.85rem",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                transform: "translateX(-50%) rotate(-1deg)",
              }}
            >
              {label}
            </div>
          )}
        </div>

        {/* Scribbled annotation */}
        <div
          className="absolute -right-4 top-1/3 text-ink-faint"
          style={{
            fontFamily: "var(--font-hand)",
            fontSize: "0.75rem",
            transform: "rotate(8deg)",
          }}
        >
          ← keep going!
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/jar/jar.tsx
git commit -m "feat: add collage-style jar container with torn paper and washi tape"
```

---

### Task 20: Jar With Marbles (Full Visualization)

**Files:**
- Create: `src/components/jar/jar-with-marbles.tsx`

- [ ] **Step 1: Create the jar-with-marbles composition**

This component positions marbles inside the jar using a simple packing algorithm.

```typescript
// src/components/jar/jar-with-marbles.tsx
"use client";

import { useMemo } from "react";
import { Jar } from "./jar";
import { MarbleDrop } from "../marble/marble-drop";

interface MarbleData {
  id: string;
  color: string;
  symbol: string;
  isNew?: boolean;
}

interface JarWithMarblesProps {
  marbles: MarbleData[];
  capacity: number;
  label?: string;
  jarWidth?: number;
  className?: string;
}

function calculateMarblePositions(
  marbles: MarbleData[],
  jarWidth: number,
  marbleSize: number
) {
  const padding = 8;
  const usableWidth = jarWidth - padding * 2 - marbleSize;
  const positions: { x: number; y: number; rotate: number }[] = [];

  // Simple row-based packing with slight randomization
  let row = 0;
  let col = 0;
  const marblesPerRow = Math.floor(usableWidth / (marbleSize + 2)) || 1;

  for (let i = 0; i < marbles.length; i++) {
    const rowOffset = row % 2 === 1 ? marbleSize * 0.4 : 0;
    const x = padding + col * (marbleSize + 2) + rowOffset;
    const y = padding + row * (marbleSize - 4);
    const rotate = ((i * 7.3 + 2.1) % 6) - 3; // deterministic pseudo-random rotation

    positions.push({ x, y, rotate });

    col++;
    if (col >= marblesPerRow - (row % 2 === 1 ? 1 : 0)) {
      col = 0;
      row++;
    }
  }

  return positions;
}

export function JarWithMarbles({
  marbles,
  capacity,
  label,
  jarWidth = 280,
  className = "",
}: JarWithMarblesProps) {
  const marbleSize = 36;
  const fillPercent = Math.min((marbles.length / capacity) * 100, 100);

  const positions = useMemo(
    () => calculateMarblePositions(marbles, jarWidth, marbleSize),
    [marbles.length, jarWidth]
  );

  return (
    <div className={className}>
      <div style={{ width: jarWidth, margin: "0 auto" }}>
        <Jar label={label}>
          {marbles.map((marble, i) => (
            <MarbleDrop
              key={marble.id}
              color={marble.color}
              symbol={marble.symbol}
              size={marbleSize}
              targetX={positions[i]?.x ?? 0}
              targetY={positions[i]?.y ?? 0}
              rotate={positions[i]?.rotate ?? 0}
              isNew={marble.isNew ?? false}
              delay={marble.isNew ? 0.1 : 0}
            />
          ))}
        </Jar>
      </div>

      {/* Fill stats */}
      <div className="text-center mt-4 space-y-1">
        <div
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-hand)" }}
        >
          {marbles.length} / {capacity}
        </div>
        <div className="text-sm text-ink-faint">
          {fillPercent.toFixed(0)}% full
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/jar/jar-with-marbles.tsx
git commit -m "feat: add jar-with-marbles composition with packing algorithm"
```

---

### Task 21: Jar View Page (Server Component + Real Data)

**Files:**
- Create: `src/app/(app)/jar/[id]/page.tsx`
- Create: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create authenticated app layout**

```typescript
// src/app/(app)/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Create jar view page**

```typescript
// src/app/(app)/jar/[id]/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { JarWithMarbles } from "@/components/jar/jar-with-marbles";
import { PaperCard } from "@/components/ui/paper-card";
import { WashiTape } from "@/components/ui/washi-tape";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JarPage({ params }: Props) {
  const { id } = await params;

  const jar = await db.jar.findUnique({
    where: { id },
    include: {
      marbles: {
        include: { user: true },
        orderBy: { earnedAt: "asc" },
      },
      group: {
        include: {
          members: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!jar) {
    notFound();
  }

  const marbleData = jar.marbles.map((m) => ({
    id: m.id,
    color: m.user.marbleColor || "#888",
    symbol: m.user.marbleSymbol || "star",
    isNew: false,
  }));

  // Calculate streaks per member
  const today = new Date().toISOString().split("T")[0];
  const memberStats = jar.group.members.map((member) => {
    const userMarbles = jar.marbles
      .filter((m) => m.userId === member.userId)
      .map((m) => m.dayDate)
      .sort()
      .reverse();

    const doneToday = userMarbles[0] === today;

    // Calculate streak
    let streak = 0;
    const checkDate = new Date();
    if (!doneToday) checkDate.setDate(checkDate.getDate() - 1);

    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      if (userMarbles.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      id: member.userId,
      name: member.user.name,
      color: member.user.marbleColor || "#888",
      symbol: member.user.marbleSymbol || "star",
      doneToday,
      streak,
    };
  });

  return (
    <div className="min-h-screen bg-paper p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1
            className="text-3xl font-bold"
            style={{
              fontFamily: "var(--font-hand)",
              transform: "rotate(-1deg)",
            }}
          >
            {jar.group.name}
          </h1>
          <p className="text-ink-light mt-1">{jar.category.toLowerCase()} jar</p>
        </div>

        {/* Jar visualization */}
        <JarWithMarbles
          marbles={marbleData}
          capacity={jar.capacity}
          label={jar.category.toLowerCase()}
        />

        {/* Treat */}
        <PaperCard className="p-4 mt-6 text-center" rotate={0.5}>
          <p className="text-sm text-ink-faint uppercase tracking-wider mb-1">
            the treat
          </p>
          <p
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            {jar.treatDescription}
          </p>
        </PaperCard>

        <WashiTape color="yellow" className="w-16 mx-auto my-6" rotate={-2} />

        {/* Member streaks */}
        <PaperCard className="p-4" rotate={-0.3}>
          <h2
            className="text-xl font-bold mb-4"
            style={{ fontFamily: "var(--font-hand)" }}
          >
            the crew
          </h2>
          <div className="space-y-3">
            {memberStats.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 p-2 border-b border-ink/10 last:border-0"
              >
                <div
                  className="w-8 h-8 rounded-full border-[2px] border-ink flex items-center justify-center text-sm shadow-[1px_1px_0_#1a1a1a]"
                  style={{
                    background: `radial-gradient(circle at 38% 38%, ${member.color}cc, ${member.color})`,
                  }}
                >
                  {member.symbol === "star" && "★"}
                  {member.symbol === "flame" && "🔥"}
                  {member.symbol === "lightning" && "⚡"}
                  {member.symbol === "moon" && "☽"}
                  {member.symbol === "heart" && "♥"}
                  {member.symbol === "spiral" && "🌀"}
                  {member.symbol === "diamond" && "◆"}
                  {member.symbol === "leaf" && "🍃"}
                </div>
                <div className="flex-1">
                  <span className="font-bold">{member.name}</span>
                  {member.streak > 0 && (
                    <span className="text-sm text-ink-faint ml-2">
                      {member.streak} day streak
                    </span>
                  )}
                </div>
                <span className="text-lg">
                  {member.doneToday ? "✓" : "·"}
                </span>
              </div>
            ))}
          </div>
        </PaperCard>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify with seed data**

Run `npx prisma db seed` then `npm run dev`. Navigate to a jar page using the ID from the database (check Prisma Studio). Verify:
- Collage-style jar renders with torn paper, washi tape, cross-hatch
- Marbles are positioned inside the jar with correct colors and symbols
- Fill percentage shows correctly
- Treat is displayed
- Member streaks show

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/jar/ src/app/\(app\)/layout.tsx
git commit -m "feat: add jar view page with marbles, streaks, and zine styling"
```

---

### Task 22: Dashboard Page

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard with groups and jars overview**

```typescript
// src/app/(app)/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { PaperCard } from "@/components/ui/paper-card";
import { WashiTape } from "@/components/ui/washi-tape";
import { Marble } from "@/components/marble/marble";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const user = await db.user.findUnique({
    where: { email: authUser.email! },
  });

  if (!user) redirect("/login");

  // Check onboarding
  if (user.onboardingStep < 7) {
    redirect("/onboarding/marble");
  }

  const memberships = await db.groupMember.findMany({
    where: { userId: user.id },
    include: {
      group: {
        include: {
          jars: {
            where: { status: { in: ["ACTIVE", "PENDING", "GOAL_SETTING"] } },
            include: {
              _count: { select: { marbles: true } },
            },
          },
          _count: { select: { members: true } },
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-paper p-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-3xl font-bold"
            style={{
              fontFamily: "var(--font-hand)",
              transform: "rotate(-1deg)",
            }}
          >
            marble jar
          </h1>
          <Marble
            color={user.marbleColor || "#888"}
            symbol={user.marbleSymbol || "star"}
            size={40}
            rotate={-3}
          />
        </div>

        <WashiTape color="blue" className="w-20 mb-6" rotate={-1} />

        {memberships.length === 0 ? (
          <PaperCard className="p-6 text-center" rotate={0.5}>
            <p
              className="text-xl mb-4"
              style={{ fontFamily: "var(--font-hand)" }}
            >
              no groups yet
            </p>
            <Link
              href="/onboarding/group"
              className="inline-block px-6 py-3 border-[2.5px] border-ink bg-ink text-paper-warm font-bold shadow-[3px_3px_0_#3a3a3a]"
            >
              create or join a group
            </Link>
          </PaperCard>
        ) : (
          <div className="space-y-6">
            {memberships.map(({ group }, gi) => (
              <PaperCard
                key={group.id}
                className="p-5"
                rotate={(gi % 2 === 0 ? -1 : 1) * 0.4}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{group.name}</h2>
                    <p className="text-sm text-ink-faint">
                      {group._count.members} member
                      {group._count.members === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span
                    className="text-xs text-ink-faint px-2 py-1 border border-ink/30"
                    style={{ fontFamily: "var(--font-hand)" }}
                  >
                    code: {group.inviteCode}
                  </span>
                </div>

                <div className="space-y-3">
                  {group.jars.map((jar, ji) => {
                    const percent = Math.round(
                      (jar._count.marbles / jar.capacity) * 100
                    );
                    return (
                      <Link
                        key={jar.id}
                        href={`/jar/${jar.id}`}
                        className="block p-3 border-[2px] border-ink bg-paper-warm shadow-[2px_2px_0_#1a1a1a] hover:shadow-[3px_3px_0_#1a1a1a] transition-shadow"
                        style={{
                          transform: `rotate(${(ji * 0.7) % 1 - 0.5}deg)`,
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold">
                              {jar.category === "WORKOUT" && "💪 "}
                              {jar.category === "MEDITATION" && "🧘 "}
                              {jar.category === "CUSTOM" && "✨ "}
                              {jar.category.toLowerCase()}
                            </span>
                            <p className="text-xs text-ink-light mt-0.5">
                              treat: {jar.treatDescription}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className="text-lg font-bold"
                              style={{ fontFamily: "var(--font-hand)" }}
                            >
                              {percent}%
                            </span>
                            <p className="text-xs text-ink-faint">
                              {jar._count.marbles}/{jar.capacity}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </PaperCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Remove the temporary test page**

Delete or replace `src/app/page.tsx` with a redirect to dashboard:

```typescript
// src/app/page.tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 3: Verify**

Run `npm run dev`. After logging in, verify:
- Dashboard shows groups with jars
- Each jar shows category, treat, and fill percentage
- Clicking a jar navigates to the jar view
- Invite code is visible

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/dashboard/ src/app/page.tsx
git commit -m "feat: add dashboard page with groups and jar overview cards"
```

---

## Summary

**This plan produces:**
- A fully functional Next.js app with zine-style UI
- Supabase auth with magic link
- Complete Prisma schema with all models
- 5-step onboarding: marble → phone → favorites → group → jars
- Animated jar visualization with spring physics marble drops
- Dashboard showing groups and jars
- Seed data for development

**What comes next (Plan 2):**
- Strava OAuth + webhook integration (Strava connect will be added as an optional step between favorites and group in the onboarding flow, and also accessible from the profile page)
- Twilio SMS setup and routing
- SMS intake agent with Claude API
- Buddy notification system

**Plan deviations from spec:**
- Added `onboardingStep: Int` field to User model (not in spec, needed for onboarding flow tracking)
- Made `marbleColor` and `marbleSymbol` nullable on User (set during onboarding, not at account creation)
- Phone uses a unique placeholder (`pending_<userId>`) at account creation, replaced with real number during onboarding
