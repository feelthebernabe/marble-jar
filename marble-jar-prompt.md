# marble jar — claude code build prompt

## what we're building

a web app called **marble jar** where friends hold each other accountable to daily workout and meditation goals. hit your goal for the day, your personalized marble (your color + your symbol) drops into a shared communal jar. fill the jar together, everyone gets the treat the group committed to at the start.

two jars run simultaneously per group — one for workouts, one for meditation. same friends, two commitments, two rewards.

---

## core rules / constraints

- **daily cadence**: one marble per person per day per jar, maximum
- **no fixed timeline**: the jar fills when it fills. could be 3 weeks, could be 4 months
- **goals are collective**: everyone in the group must agree on the goal before the jar activates. goals lock after activation
- **treat is committed upfront**: the group names the reward for each jar before any marbles drop
- **no honor system**: workout marbles require strava confirmation OR a witness. meditation marbles require a witness. nothing self-certifies alone
- **one jar at a time per group** (architecture should support multiple later — do not hardcode this constraint)

---

## tech stack

- **next.js** (app router, typescript)
- **supabase** (auth, postgres database, edge functions for webhooks + cron)
- **prisma** (ORM)
- **framer motion** (marble drop animations — this is the heart of the UI, make it feel real)
- **tailwind css** (styling)
- **twilio** (SMS phone number — inbound and outbound)
- **claude API** (anthropic SDK — three agents, detailed below)
- **strava oauth + webhooks** (workout tracking)

---

## database schema

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  name            String
  phone           String?  @unique
  marbleColor     String   // hex value
  marbleSymbol    String   // enum: star, flame, lightning, moon, heart, spiral, diamond, leaf
  stravaToken     String?
  stravaRefresh   String?
  stravaAthleteId String?
  createdAt       DateTime @default(now())

  jarMembers      JarMember[]
  marbles         Marble[]
  activities      Activity[]
  witnesses       Witness[]
}

model Jar {
  id              String    @id @default(cuid())
  type            JarType   // WORKOUT | MEDITATION
  status          JarStatus // PENDING | ACTIVE | COMPLETE
  treatDescription String
  capacity        Int       // calculated: number of active members × days until group decides to stop (open-ended = set a soft cap like 100)
  createdAt       DateTime  @default(now())
  completedAt     DateTime?

  members         JarMember[]
  marbles         Marble[]
  activities      Activity[]
}

enum JarType {
  WORKOUT
  MEDITATION
}

enum JarStatus {
  PENDING
  ACTIVE
  COMPLETE
}

model JarMember {
  id           String   @id @default(cuid())
  jarId        String
  userId       String
  joinedAt     DateTime @default(now())
  dailyGoal    String   // e.g. "1 workout per day" or "10 min meditation"
  goalApproved Boolean  @default(false)

  jar          Jar  @relation(fields: [jarId], references: [id])
  user         User @relation(fields: [userId], references: [id])
}

model Marble {
  id        String   @id @default(cuid())
  jarId     String
  userId    String
  earnedAt  DateTime @default(now())
  dayDate   String   // YYYY-MM-DD, used for dedup
  source    String   // strava | sms | manual

  jar       Jar  @relation(fields: [jarId], references: [id])
  user      User @relation(fields: [userId], references: [id])

  @@unique([jarId, userId, dayDate]) // one marble per person per day per jar
}

model Activity {
  id              String         @id @default(cuid())
  userId          String
  jarId           String
  source          String         // strava | sms
  status          ActivityStatus // PENDING | CONFIRMED | REJECTED
  description     String?
  loggedAt        DateTime       @default(now())
  stravaActivityId String?       @unique

  user            User     @relation(fields: [userId], references: [id])
  jar             Jar      @relation(fields: [jarId], references: [id])
  witness         Witness?
}

enum ActivityStatus {
  PENDING
  CONFIRMED
  REJECTED
}

model Witness {
  id           String    @id @default(cuid())
  activityId   String    @unique
  witnessId    String
  confirmedAt  DateTime?
  token        String    @unique @default(cuid()) // for one-tap SMS confirmation link

  activity     Activity @relation(fields: [activityId], references: [id])
  witness      User     @relation(fields: [witnessId], references: [id])
}
```

---

## the three agents

all agents use the anthropic SDK. each is a separate module. tools are plain async functions passed to the API call.

---

### agent 1: SMS intake agent

**trigger**: every inbound twilio SMS  
**lives in**: `app/api/sms/route.ts` (or supabase edge function)

**job**: read an incoming text, figure out what the person means, log the right activity, text back confirmation or ask a clarifying question. if manual logging, trigger a witness request.

**tools to give it**:

```typescript
get_user_by_phone(phone: string) // → User | null
get_active_jars(userId: string)  // → Jar[] with type and member info
log_activity(userId: string, jarId: string, description: string) // → Activity (PENDING)
send_sms(to: string, message: string) // → void
request_witness(activityId: string)  // picks a random jar member and texts them a confirm link
```

**system prompt**:
```
you are the marble jar intake agent. you receive text messages from users who are logging 
their daily workouts or meditations. your job is to figure out what they did, which jar it 
belongs to, and log it correctly.

rules:
- if the message clearly maps to one jar type (workout or meditation), log it without asking
- if it's ambiguous, text back one short clarifying question. never ask two questions at once
- if the user has no active jars, tell them kindly
- be warm, brief, and slightly playful. you're a friend, not a form
- after logging, always confirm with the jar name and a small encouragement. never be generic
- do not log the same person twice in one day for the same jar
```

---

### agent 2: goal-setting agent

**trigger**: during jar creation, after all members have joined but before the jar activates  
**lives in**: `app/api/agents/goal-setting/route.ts`

**job**: facilitated group conversation to land on a goal everyone agrees to. looks at each member's strava history (workout jar) or just asks directly (meditation jar). helps the group decide together.

**tools to give it**:

```typescript
get_strava_history(userId: string, weeks: number) // → weekly activity counts for last N weeks
get_jar_members(jarId: string)                    // → User[] with their history
set_group_goal(jarId: string, goal: string)       // → locks the goal when all approve
send_message_to_jar(jarId: string, message: string) // → posts to jar feed
```

**system prompt**:
```
you are helping a group of friends set a shared daily goal for their marble jar.
look at everyone's history, notice patterns, and guide them toward a goal that is 
challenging but realistic — one that most people can actually hit most days.

for workout jars: pull strava history and reason about it before making a suggestion.
for meditation jars: ask the group directly about their current practice.

be honest about what the data shows. do not flatter. do not suggest a goal that looks 
impossible based on the history. the goal should make people a little proud and a little nervous.

once everyone agrees, lock it in and send a short hype message to the jar feed.
```

---

### agent 3: weekly hype agent

**trigger**: every monday at 8am (supabase cron job → edge function)  
**lives in**: `supabase/functions/weekly-hype/index.ts`

**job**: autonomous. wakes up, checks both jars, notices what's happening, writes one punchy personalized message per jar, posts it to the feed.

**tools to give it**:

```typescript
get_all_active_jars()                            // → Jar[]
get_jar_members(jarId: string)                   // → User[] 
get_marble_history(userId: string, jarId: string) // → marbles for last 4 weeks with dates
get_jar_status(jarId: string)                    // → { total_marbles, capacity, percent_full, weeks_running }
post_to_feed(jarId: string, message: string)     // → FeedPost
```

**system prompt**:
```
you are the marble jar hype coach. every monday morning you check in on each jar.
your job: write one short, punchy, specific message to post to each jar's feed.

things to notice and reference:
- who has a streak going (hit their goal multiple days in a row)
- who came back after missing days
- who hasn't logged anything in a while (mention gently, not shaming)
- how close the jar is to full
- any milestones (first marble, halfway point, etc.)

rules:
- use people's actual names
- be specific. "sarah's been on a 6-day streak" not "great work everyone"
- one message per jar. short. 3-5 sentences max.
- warm and slightly competitive. like a good coach, not a corporate wellness app.
- do not be generic. ever.
```

---

## strava integration

### oauth flow
1. user clicks "connect strava" in onboarding
2. redirect to strava authorization URL with your client_id and `activity:read_all` scope
3. strava redirects back to `/api/strava/callback` with a code
4. exchange code for access_token + refresh_token, store on user record
5. register a strava webhook subscription pointing to `/api/strava/webhook`

### webhook handler (`app/api/strava/webhook/route.ts`)
```typescript
// GET: strava webhook verification (required during setup)
// POST: incoming activity events

// on POST:
// 1. verify it's from strava (hub.verify_token)
// 2. get the athlete_id from the event
// 3. look up the user by stravaAthleteId
// 4. fetch the activity details from strava API (using their stored token)
// 5. check if they've already hit their daily goal today for the workout jar
// 6. if not: create Activity (CONFIRMED, source: strava), mint Marble
// 7. send SMS confirmation: "🏃 marble dropped. [jar name] is X% full."
// refresh token if expired before making strava API calls
```

---

## twilio setup

- one phone number for the whole app
- inbound SMS → POST to `/api/sms/route.ts`
- all outbound SMS through `twilio.messages.create()`
- witness confirmation: generate a unique token URL (e.g. `/confirm/[token]`), text it to the witness as a link. one tap confirms.

env vars needed:
```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
```

---

## screens

### 1. home — both jars
- two jar visualizations side by side (or stacked mobile)
- each jar shows: type, % full, treat name, marble count
- tap a jar to go to jar view
- navigation: home / feed / profile

### 2. jar view
- large animated jar filling with marbles
- each marble renders with its owner's color and symbol
- marbles drop with a satisfying framer motion animation when newly earned
- sidebar or bottom sheet: each member's streak + today's status (✓ done / ○ not yet)

### 3. marble feed
- chronological activity log
- each entry: "[name]'s [color][symbol] marble dropped into the [jar name] jar"
- emoji reaction bar (no comments, just reactions)
- witness confirmation requests appear here too

### 4. onboarding flow (multi-step)
- step 1: name + email (magic link auth)
- step 2: pick marble color (color wheel or palette)
- step 3: pick marble symbol (visual icon grid)
- step 4: add phone number (for SMS)
- step 5: connect strava (oauth redirect)
- step 6: join or create a jar (invite link or new jar)
- step 7: goal setting (agent-facilitated if new jar, or just view the locked goal if joining)

### 5. jar settings
- treat name for each jar (editable until jar activates)
- invite link
- member list with their marble previews
- goal (locked after activation)

### 6. celebration screen
- triggered when jar reaches capacity
- full screen confetti, all marbles visible
- treat name revealed
- "start a new jar" button
- archives the completed jar

### 7. profile
- your marble preview (big, centered)
- your stats: total marbles, current streak, longest streak
- connected accounts: strava status, phone number
- history of completed jars

---

## ui / design direction

the aesthetic is **tactile, playful, and slightly analog** — like a real glass jar sitting on a kitchen counter. not sterile or corporate. not dark-mode productivity app.

- glass jar should feel physical: reflections, depth, marbles have weight
- marble colors are rich and saturated, symbols are clean
- animations matter here more than anywhere else. a marble dropping should feel like a real marble dropping. use framer motion `spring` physics
- typography: something warm and slightly rounded, not a generic sans-serif
- color palette: warm off-whites, deep jewel tones for marbles, soft shadows

---

## build order

build in this sequence. do not skip ahead.

1. **supabase project setup** — create project, run prisma schema, set up auth (magic link)
2. **next.js scaffold** — app router, tailwind, framer motion, prisma client
3. **onboarding flow** — auth → marble picker → phone → strava oauth → join/create jar
4. **static jar view** — render the jar with hardcoded fake marbles. get the visual and animation right before any logic
5. **strava webhook** — connect, receive events, mint marbles automatically
6. **twilio basic SMS** — receive "done", log activity as pending, send back confirmation
7. **witness mechanic** — pending activity → text a member → one-tap token confirm → mint marble
8. **SMS intake agent** — upgrade the twilio handler to use claude API with tool calling
9. **this week view** — daily streaks, today's status per member
10. **feed + reactions** — marble drop log, emoji reactions
11. **goal-setting agent** — activate during jar creation, strava history + group conversation
12. **weekly hype agent** — supabase cron → edge function → claude API → post to feed
13. **celebration screen** — jar full trigger, confetti, treat reveal, archive
14. **jar settings + collective goal approval** — lock/unlock flow, invite link, treat naming

---

## environment variables needed

```
# supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# database
DATABASE_URL

# strava
STRAVA_CLIENT_ID
STRAVA_CLIENT_SECRET
STRAVA_VERIFY_TOKEN

# twilio
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER

# anthropic
ANTHROPIC_API_KEY

# app
NEXT_PUBLIC_APP_URL
```

---

## notes for claude code

- use typescript everywhere. no javascript files.
- use the anthropic SDK (`@anthropic-ai/sdk`) for all agent calls, not raw fetch
- all agent tool functions should be real async functions, not mocks — wire them to the actual database from the start
- the `@@unique([jarId, userId, dayDate])` constraint on Marble is critical — let the database enforce no double-minting, don't just rely on application logic
- framer motion marble drop animation: use `spring` type with stiffness ~300, damping ~20. marbles should feel heavy, not floaty
- the jar fill percentage should be calculated server-side and passed as a prop, not derived on the client
- for the weekly hype agent: run it as a supabase edge function on cron, not a next.js API route. it needs to run even when no one is using the app
- keep agent system prompts in a separate `/lib/agents/prompts.ts` file so they're easy to iterate on without touching logic code
