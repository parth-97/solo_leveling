# Solo Leveling — Complete Backend Architecture
## Production-Ready Design for Supabase + Next.js + PostgreSQL

---

## 0. What's In This Package

| File | Contents |
|---|---|
| `01_schema_and_tables.sql` | All 23 PostgreSQL tables, enums, indexes, triggers |
| `02_rls_policies.sql` | Row Level Security policies for every table |
| `03_analytics_engine.sql` | All 7 score formulas + DB functions for XP, streaks, quests |
| `04_typescript_interfaces.ts` | Every type the frontend needs, incl. events & API wrappers |
| `05_api_and_services.ts` | 60+ API endpoints, folder structure, service classes, event system |
| `06_security_and_scalability.md` | Anti-cheat, rate limiting, caching, 3-phase scaling plan |

---

## 1. Tech Stack Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Auth | Supabase Auth (Google OAuth + Email) | Native JWT, magic links, zero-config RLS integration |
| Database | PostgreSQL 15+ via Supabase | ACID, row-level security, pg_cron, realtime |
| API | Next.js 14 App Router route handlers | Collocated with frontend, edge-ready |
| Validation | Zod | End-to-end type safety from schema to TypeScript |
| Caching | Upstash Redis | Serverless-compatible, global replicas |
| Jobs | Vercel Cron + Inngest | Serverless job queue for quest gen, reports |
| Email | Resend | Developer-first transactional email |
| Push | Web Push / FCM | Browser notifications for quests, achievements |
| Search | Supabase pg_trgm (launch) → Elasticsearch (scale) | Fuzzy username search |
| Realtime | Supabase Realtime (Postgres changes) | Instant feed + notifications |
| Storage | Supabase Storage | Avatars, badges, report PDFs |

---

## 2. Database Tables (23 total)

| # | Table | Purpose | Key Relationships |
|---|---|---|---|
| 1 | `profiles` | User identity, XP, level, rank, streak | auth.users (1:1) |
| 2 | `categories` | Fitness, Learning, etc. (seeded) | goals, habits, quests |
| 3 | `goals` | All goal types (daily→yearly→custom) | profiles, categories |
| 4 | `goal_milestones` | Sub-tasks within a goal | goals |
| 5 | `habits` | Habit definitions | profiles, categories |
| 6 | `habit_logs` | Daily completion records | habits (1 per day) |
| 7 | `xp_transactions` | Immutable XP ledger | profiles |
| 8 | `level_config` | XP thresholds + rank per level | — |
| 9 | `quest_templates` | Quest library for generation | categories |
| 10 | `daily_quests` | Active user quests, expire at midnight | profiles, templates |
| 11 | `achievements` | Achievement definitions + trigger rules | — |
| 12 | `user_achievements` | Unlock records | profiles, achievements |
| 13 | `analytics_scores` | Daily snapshot of all 7 scores | profiles |
| 14 | `reports` | Generated period reports (JSONB) | profiles |
| 15 | `friendships` | Bidirectional friend graph | profiles (self-ref) |
| 16 | `groups` | Community groups | profiles |
| 17 | `group_members` | Group membership + roles | groups, profiles |
| 18 | `challenges` | Time-boxed community challenges | profiles, groups |
| 19 | `challenge_participants` | Participation + progress | challenges, profiles |
| 20 | `leaderboard_snapshots` | Cached ranked lists | profiles |
| 21 | `notifications` | In-app + push notification records | profiles |
| 22 | `ai_insights` | AI-generated suggestions | profiles |
| 23 | `activity_feed` | Social activity stream | profiles |

---

## 3. XP & Rank System

### Level Formula
```
xp_required(level) = floor(100 × level^1.8)
```

### Rank Thresholds

| Rank | Min Level | XP Required | Title |
|---|---|---|---|
| E | 1 | 0 | Weakest |
| D | 5 | 960 | Apprentice |
| C | 10 | 3,981 | Adept |
| B | 20 | 13,195 | Expert |
| A | 35 | 36,563 | Master |
| S | 50 | 83,176 | Legend |
| National | 100 | 500,000 | National Hero |
| Monarch | 150 | 1,500,000 | Shadow Monarch |

### XP Sources

| Source | XP |
|---|---|
| Easy quest | 50–100 |
| Normal quest | 100–200 |
| Hard quest | 200–350 |
| Elite quest | 350–500 |
| Legendary quest | 500–1000 |
| Habit completion | 50 (configurable) |
| Goal milestone | 100 (configurable) |
| Goal completion | 500–10,000 |
| Achievement (common) | 50 |
| Achievement (rare) | 200 |
| Achievement (epic) | 500 |
| Achievement (legendary) | 1,000 |
| Challenge win | 1,000+ |

---

## 4. Analytics Score Formulas (exact)

### Variables
```
Q_done        quests completed today
Q_total       quests assigned today
H_done        habits completed today
H_total       active habits count
streak        current streak in days
xp_today      XP earned today
xp_7d_avg     average daily XP last 7 days
hr_X          habit completion rate for category X (0–1)
goal_prog     average progress of active goals (0–100)
level         current user level
achievements  total achievements unlocked
friend_count  accepted friends
friend_int    distinct friends active this week (cap 10)
challenge_p   fraction of challenges completed this month (0–1)
```

### Score 1 — Discipline (consistency)
```
discipline = min(
  (Q_done/max(Q_total,1)) × 100 × 0.4 +
  (H_done/max(H_total,1)) × 100 × 0.4 +
  min(streak/30, 1) × 20
, 100)
```

### Score 2 — Productivity (output)
```
productivity = min(
  (Q_done/max(Q_total,1)) × 100 × 0.5 +
  min((xp_today/max(xp_7d_avg,50)) × 100, 150) × 0.3 +
  (goal_prog/100) × 20
, 100)
```

### Score 3 — Health (physical + mental)
```
health = min(hr_fitness × 70 + hr_mindfulness × 30, 100)
```

### Score 4 — Learning (knowledge)
```
learning = min(
  hr_learning × 60 +
  (learning_quests_done/max(learning_quests_total,1)) × 40
, 100)
```

### Score 5 — Growth (long-term progress)
```
growth = min(
  min(level/100, 1) × 40 +
  (goal_prog/100) × 40 +
  min(achievements/50, 1) × 20
, 100)
```

### Score 6 — Relationship (community)
```
relationship = min(
  min(friend_count/10, 1) × 40 +
  min(friend_int/10, 1) × 40 +
  challenge_p × 20
, 100)
```

### Score 7 — Life Score (master composite)
```
life_score = round(
  discipline   × 0.25 +
  productivity × 0.20 +
  health       × 0.20 +
  learning     × 0.15 +
  growth       × 0.10 +
  relationship × 0.10
)
```

---

## 5. Key Security Rules

1. **User IDs always from session** — never trust `body.userId`
2. **RLS on every table** — database enforces ownership, not just API
3. **`award_xp()` is SECURITY DEFINER** — only callable server-side
4. **XP is append-only** — no UPDATE/DELETE on xp_transactions
5. **UNIQUE(habit_id, logged_date)** — prevents duplicate habit completions
6. **UNIQUE(user_id, template_id, quest_date)** — prevents quest replay
7. **Cron endpoints need `INTERNAL_CRON_SECRET` header** — not accessible publicly
8. **Input validated with Zod** at route handler level before any DB call
9. **Rate limiting** via Upstash: 60 req/min general, 10/hour for quest completion
10. **No PII in logs** — user IDs only, no emails/names in server logs

---

## 6. Supabase RLS Summary

| Table | Select | Insert | Update | Delete |
|---|---|---|---|---|
| profiles | own + public profiles | trigger only | own | — |
| goals | own | own | own | own |
| habits | own | own | own | own |
| habit_logs | own | own | own | own |
| xp_transactions | own | service_role | — | — |
| daily_quests | own | service_role | own (complete only) | — |
| user_achievements | own | service_role | — | — |
| analytics_scores | own | service_role | — | — |
| reports | own | service_role | — | — |
| friendships | both parties | requester | both parties | both parties |
| groups | public + members | owner | owner | owner |
| challenges | open/active/completed | creator | creator | — |
| notifications | own | service_role + own | own | own |
| leaderboard_snapshots | all authenticated | service_role | — | — |
| activity_feed | own + friends' public | service_role | — | — |

---

## 7. Cron Job Schedule

| Time | Job | What It Does |
|---|---|---|
| 00:00 UTC daily | `daily-quests` | Generate 5 quests per active user |
| 00:05 UTC daily | `streaks` | Recalculate streaks, flag breaks |
| 23:55 UTC daily | `analytics` | Snapshot all 7 scores per user |
| Sunday 23:58 | `leaderboard?period=weekly` | Rebuild weekly rankings |
| 1st of month 01:00 | `leaderboard?period=monthly` | Rebuild monthly rankings |
| Monday 01:00 | `reports?period=weekly` | Generate weekly reports |
| 1st of month 01:00 | `reports?period=monthly` | Generate monthly reports |

---

## 8. Implementation Order

### Week 1 — Foundation
1. Run migrations (01 → 08)
2. Supabase Auth + Google OAuth
3. Profile auto-creation trigger
4. `/api/v1/profile/me` GET/PATCH
5. Onboarding endpoint

### Week 2 — Core Loop
6. Goals CRUD
7. Habits CRUD + log endpoint
8. Quest generation + completion
9. `award_xp()` function wired to all three

### Week 3 — Gamification
10. Achievement engine + unlock checker
11. Streak recalculation
12. Level-up notifications
13. Analytics score computation

### Week 4 — Community
14. Friendships
15. Activity feed
16. Leaderboard (snapshot + API)
17. Challenges

### Week 5 — Polish
18. Reports generation
19. AI insights
20. Push notifications
21. Cron jobs
22. Rate limiting
23. Redis caching layer

---

*Architecture version: 1.0.0 — Designed for Solo Leveling SaaS, June 2026*
*Frontend: Vite + React 19 + TypeScript + shadcn/ui*
*Backend: Next.js 14 + Supabase + PostgreSQL 15*
