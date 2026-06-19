# Solo Leveling — Security Architecture & Scalability Plan

## 1. Security Architecture

### 1.1 Authentication Layers

```
Request → Edge Middleware (JWT validation)
              ↓
         Route Handler (session check via createServerClient)
              ↓
         Service Layer (user_id always from session, never from body)
              ↓
         Database (RLS enforces ownership at data layer)
```

**Never trust client-supplied user IDs.** Every service method extracts
`userId` from the verified Supabase session:

```typescript
// src/lib/auth/session.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function requireAuth() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session) throw new UnauthorizedError()
  return session
}
```

### 1.2 Input Validation — Zod Schemas

```typescript
// src/schemas/goal.schema.ts
import { z } from 'zod'

export const CreateGoalSchema = z.object({
  title:       z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  categoryId:  z.string().uuid().optional(),
  period:      z.enum(['daily','weekly','monthly','yearly','custom']),
  targetValue: z.number().positive().optional(),
  unit:        z.string().max(50).optional(),
  xpReward:    z.number().int().min(0).max(50000).default(500),
  deadline:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  milestones:  z.array(z.object({
    title:    z.string().min(1).max(200),
    xpReward: z.number().int().min(0).default(100)
  })).max(20).optional()
})
```

### 1.3 Rate Limiting

```typescript
// src/lib/cache/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1 m'),  // 60 req/min per user
  analytics: true,
  prefix: 'solo-leveling:rl'
})

// Stricter limits for mutation endpoints:
export const questCompletionLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.fixedWindow(10, '1 h'),     // 10 quest completions/hour
  prefix: 'solo-leveling:quest'
})
```

### 1.4 Anti-Cheat Rules

| Vector | Mitigation |
|---|---|
| XP injection | `award_xp()` is a SECURITY DEFINER DB function — only called server-side; no client write on xp_transactions |
| Quest replay | UNIQUE(user_id, template_id, quest_date) prevents double completion |
| Backdated habit logs | Habit log date capped to `CURRENT_DATE` in API layer; logs > 2 days old rejected |
| Fake leaderboard | Leaderboard rebuilt from xp_transactions (immutable ledger), not profile.xp |
| Token theft | Short-lived JWT (1h), refresh token rotation, logout invalidates refresh token |
| Excessive quest gen | Quest generation idempotent; if quests already exist today, returns existing |

### 1.5 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...        # Safe to expose
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # NEVER expose to client
DATABASE_URL=postgresql://...               # Direct connection (migrations only)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
RESEND_API_KEY=re_...
INTERNAL_CRON_SECRET=...                    # Used to authenticate internal cron
```

### 1.6 CORS & Headers (next.config.ts)

```typescript
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',   value: 'on' },
  { key: 'X-Frame-Options',          value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',   value: 'nosniff' },
  { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',       value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]
```

---

## 2. Scalability Plan

### Phase 1: Launch (0 → 10K users)

**Infrastructure:** Supabase Pro, Vercel Hobby → Pro  
**Caching:** Upstash Redis (read caching for leaderboards, scores)  
**Storage:** Supabase Storage for avatars  
**Cost target:** ~$50/month

Key patterns:
- All reads hit Supabase with RLS (no separate cache layer yet)
- Daily scores computed on-demand and cached in Redis for 15min
- Leaderboard rebuilt daily by cron via pg function
- Notifications stored in DB, polled on frontend via Supabase Realtime

### Phase 2: Growth (10K → 100K users)

**Infrastructure:** Supabase Team plan (read replicas), Vercel Pro  
**Queue:** Inngest or BullMQ on Upstash for async jobs  
**CDN:** Cloudflare for avatar/badge assets  
**Cost target:** ~$300/month

Key additions:
- Route heavy analytics computation to background queue jobs
- Add read replica for analytics + leaderboard queries
- Implement cursor-based pagination on all list endpoints
- Redis cache layer for profiles, daily quests (TTL: 5 min)
- Supabase Realtime for notifications and activity feed

```typescript
// Cache key strategy
const CACHE_KEYS = {
  userProfile:    (id: string) => `profile:${id}`,           // TTL: 60s
  dailyQuests:    (id: string, date: string) => `quests:${id}:${date}`,  // TTL: until midnight
  leaderboard:    (period: string) => `lb:${period}`,         // TTL: 1h
  analyticsToday: (id: string) => `analytics:today:${id}`,   // TTL: 15min
  unreadCount:    (id: string) => `notif:unread:${id}`,       // TTL: 30s
}
```

### Phase 3: Scale (100K → 1M users)

**Infrastructure:**  
- Migrate to dedicated PostgreSQL (AWS RDS Aurora Serverless v2)  
- Supabase → self-hosted or Supabase Enterprise  
- Deploy backend to AWS Lambda or Fly.io (edge functions)  
- Add ElasticSearch for user/group search  
- Apache Kafka for event streaming  

**Database partitioning:**

```sql
-- Partition high-volume tables by date
CREATE TABLE public.habit_logs_2026 PARTITION OF public.habit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE public.xp_transactions_2026 PARTITION OF public.xp_transactions
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Partition notifications by user range (hash partitioning)
CREATE TABLE public.notifications PARTITION BY HASH (user_id);
```

**Caching tiers:**

```
L1: Next.js unstable_cache (in-process, 5s TTL for hot data)
L2: Upstash Redis (distributed, 60s–1h TTL)
L3: Postgres materialized views (refreshed every 5 min for leaderboards)
```

**Queue architecture:**

```
User Action → API Route → DB Write → Event Emit
                                         ↓
                              ┌──────────┼──────────────┐
                              ↓          ↓              ↓
                       Achievement   Analytics     Notification
                         Queue        Queue          Queue
                              ↓          ↓              ↓
                         Check &    Compute &      Send push +
                         Unlock     Snapshot        DB insert
```

---

## 3. Cron Job Schedule

```
# Supabase pg_cron or Vercel Cron

# Generate daily quests for all active users (UTC midnight)
0 0 * * *   POST /api/internal/cron/daily-quests

# Snapshot analytics scores (23:55 every night)
55 23 * * *  POST /api/internal/cron/analytics

# Rebuild weekly leaderboard (Sunday 23:58)
58 23 * * 0  POST /api/internal/cron/leaderboard?period=weekly

# Rebuild monthly leaderboard (last day of month 23:59)
59 23 28-31 * *  POST /api/internal/cron/leaderboard?period=monthly

# Recalculate streaks + detect breaks (00:05 every day)
5 0 * * *   POST /api/internal/cron/streaks

# Generate weekly reports (Monday 01:00)
0 1 * * 1   POST /api/internal/cron/reports?period=weekly

# Generate monthly reports (1st of month 01:00)
0 1 1 * *   POST /api/internal/cron/reports?period=monthly
```

---

## 4. Realtime Subscriptions (Supabase Realtime)

Subscribe from frontend:

```typescript
// Notifications in real-time
const channel = supabase
  .channel('user-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    toast(payload.new.title)
    updateUnreadCount(c => c + 1)
  })
  .subscribe()

// Activity feed
const feedChannel = supabase
  .channel('activity-feed')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'activity_feed',
  }, (payload) => {
    if (isFriend(payload.new.user_id)) prependToFeed(payload.new)
  })
  .subscribe()
```

---

## 5. ERD — Entity Relationship Summary

```
auth.users ──────────────── profiles (1:1)
                                │
             ┌──────────────────┼───────────────────────┐
             │                  │                        │
           goals             habits               daily_quests
             │                  │
      goal_milestones       habit_logs
             
profiles ─── xp_transactions (1:many, immutable ledger)
profiles ─── user_achievements ─── achievements (many:many)
profiles ─── analytics_scores (1:many, one per day)
profiles ─── reports (1:many)
profiles ─── notifications (1:many)
profiles ─── ai_insights (1:many)
profiles ─── activity_feed (1:many)

profiles ─── friendships ─── profiles (self-referential many:many)
profiles ─── group_members ─── groups (many:many)
profiles ─── challenge_participants ─── challenges (many:many)
profiles ─── leaderboard_snapshots (1:many)

categories ──────────────── goals, habits, daily_quests, quest_templates
```

**Relationship cardinalities:**

| From | To | Type | Notes |
|---|---|---|---|
| profiles | goals | 1:many | user owns many goals |
| goals | goal_milestones | 1:many | cascade delete |
| profiles | habits | 1:many | user owns many habits |
| habits | habit_logs | 1:many | one per day max |
| profiles | xp_transactions | 1:many | immutable append-only |
| profiles | daily_quests | 1:many | 5 per day generated |
| profiles | user_achievements | 1:many | uniqueness enforced |
| profiles | friendships | many:many | self-referential |
| profiles | groups | many:many | via group_members |
| profiles | challenges | many:many | via challenge_participants |
| profiles | analytics_scores | 1:many | one snapshot per day |

---

## 6. Deployment Checklist

### Before Launch

- [ ] Enable pgcrypto, pg_trgm, uuid-ossp extensions in Supabase
- [ ] Run all migrations in order (0001 → 0008)
- [ ] Seed level config (all 100+ levels with xp_required)
- [ ] Seed achievement definitions
- [ ] Seed quest templates (minimum 50 for variety)
- [ ] Seed categories
- [ ] Enable Row Level Security on all tables (verify in Supabase dashboard)
- [ ] Set up Supabase Auth with Google OAuth provider
- [ ] Configure redirect URLs in Supabase Auth settings
- [ ] Set up Upstash Redis
- [ ] Configure Resend for transactional emails
- [ ] Set up Vercel Cron jobs
- [ ] Configure INTERNAL_CRON_SECRET and validate middleware
- [ ] Enable Supabase Realtime for: notifications, activity_feed

### Performance Verification

- [ ] All list endpoints return in < 100ms with realistic data
- [ ] Leaderboard query with 10K users < 200ms (uses snapshot table)
- [ ] Analytics scores computed in < 500ms
- [ ] Quest generation for 1000 users in < 30s (batch cron)
- [ ] RLS policies don't cause N+1 on joins (verify with EXPLAIN ANALYZE)
