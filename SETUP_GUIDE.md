# Solo Leveling — Setup Guide

## Prerequisites
- Node.js 20+
- A Supabase project (free tier works)

---

## Step 1 — Supabase Database Setup

Open the Supabase SQL editor and run these files **in order**:

```
1. files/01_schema_and_tables.sql      — tables, triggers, enums
2. files/02_rls_policies.sql           — row-level security
3. files/03_analytics_engine.sql       — score functions, award_xp, etc.
4. missing_code/07_missing_rls_policies.sql  ← REQUIRED: fixes RLS gaps
5. missing_code/fix_award_xp_action.sql      ← REQUIRED: fixes activity feed
6. missing_code/fix_increment.sql            ← REQUIRED: atomic counters
7. server/migrations/04_level_config_seed.sql
8. server/migrations/05_quest_templates_seed.sql
9. server/migrations/06_achievements_seed.sql
```

Optional (adds category interest persistence):
```
10. missing_code/08_user_category_interests.sql
```

---

## Step 2 — Server Environment

```bash
cd server
cp ../missing_code/server.env.example .env.local
# Edit .env.local and fill in:
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#   CRON_SECRET
#   ALLOWED_ORIGINS=http://localhost:5173
```

In `server/package.json`, ensure the dev script runs on port 3001:
```json
"scripts": {
  "dev": "next dev -p 3001"
}
```

---

## Step 3 — App Environment

```bash
cd app
# .env is already committed with correct defaults for local dev.
# Verify these values:
#   VITE_SUPABASE_URL=<same as server>
#   VITE_SUPABASE_ANON_KEY=<same as server>
#   VITE_API_BASE_URL=http://localhost:3001/api/v1
```

---

## Step 4 — Copy Missing Utility Files

```bash
# From repo root:
cp missing_code/icons.ts          app/src/lib/icons.ts
cp missing_code/time.ts           app/src/lib/time.ts
cp missing_code/ranks.ts          app/src/lib/ranks.ts
cp -r missing_code/adapters/      app/src/lib/adapters/
```

---

## Step 5 — Apply Server-Side Fixes

```bash
# Replace the AchievementService with the fixed version:
cp missing_code/AchievementService.fixed.ts \
   server/src/services/AchievementService.ts

# Replace quest completion route:
cp missing_code/quest_complete_fix.ts \
   server/src/app/api/v1/quests/[id]/complete/route.ts

# Replace onboarding route (adds avatar + analytics seed):
cp missing_code/onboarding_complete_updated.ts \
   server/src/app/api/v1/onboarding/complete/route.ts
```

---

## Step 6 — Fix Onboarding.tsx RANKS Import

In `app/src/pages/Onboarding.tsx`, change:
```ts
// BEFORE:
import { mockCategories as fallbackCategories, RANKS } from '@/data/mockData';

// AFTER:
import { mockCategories as fallbackCategories } from '@/data/mockData';
import { RANKS } from '@/lib/ranks';
```

---

## Step 7 — Start Dev Servers

```bash
# Terminal 1:
cd server && npm run dev   # starts on :3001

# Terminal 2:
cd app && npm run dev      # starts on :5173
```

Open http://localhost:5173. Sign up → complete onboarding → Dashboard.

---

## Supabase Auth Configuration

In Supabase Dashboard → Authentication → URL Configuration:
- **Site URL:** `http://localhost:5173`
- **Redirect URLs:** `http://localhost:5173/**`

For Google OAuth (if using): enable in Authentication → Providers → Google.
The redirect URL for Google is: `https://<your-project>.supabase.co/auth/v1/callback`

---

## Cron Jobs (optional for local dev)

The cron routes at `/api/internal/cron/*` are designed to be called by an
external scheduler (Vercel Cron, GitHub Actions, etc.). For local testing:

```bash
curl -X POST http://localhost:3001/api/internal/cron/daily-quests \
  -H "Authorization: Bearer <your_CRON_SECRET>"
```
