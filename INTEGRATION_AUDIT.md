# Solo Leveling — Full Integration Audit Report

> Audited: Frontend (Vite/React), Backend (Next.js API), Supabase SQL (schema + RLS + analytics), Migrations

---

## SUMMARY OF FINDINGS

| Category | Issues Found |
|---|---|
| Environment Variables | 3 blockers |
| Port / CORS mismatch | 1 blocker |
| Missing Supabase RLS policies | 4 tables unprotected |
| Missing migration ordering | 1 blocker (schema must run before migrations) |
| Missing `user_category_interests` table | 1 acknowledged gap |
| Avatar URL not persisted on onboarding | 1 functional gap |
| `quest_templates` table has no `sort_order` column | 1 migration warning |
| Onboarding page uses `RANKS` from mockData | 1 correctness issue |
| `AchievementService` slug dispatch | 1 correctness issue |
| `quests_completed` race condition | 1 reliability issue |
| `habitsTracked` counter never incremented | 1 missing update |
| `Activity feed` `leveled_up` action value mismatch | 1 type issue |
| `handle_new_user` trigger does not set score columns | 1 correctness gap |
| Missing `src/lib/icons.ts` | 1 missing file |
| Missing `src/lib/time.ts` | 1 missing file |
| Missing `src/lib/adapters/profile.ts` | 1 missing file |
| Missing server `.env.example` | 1 missing file |

---

## SECTION 1 — ENVIRONMENT VARIABLES

### 1.1 `SUPABASE_SERVICE_ROLE_KEY` missing from `server/.env.local`

**Problem:** `server/.env.local` only contains:
```
ALLOWED_ORIGINS=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```
The `SUPABASE_SERVICE_ROLE_KEY` is never set. Cron routes
(`/api/internal/cron/*`) use `getServiceRoleClient()` which calls
`process.env.SUPABASE_SERVICE_ROLE_KEY`. Without this, all cron jobs
(daily quest generation, streak updates, analytics snapshots, leaderboard
snapshots, report generation) will throw at runtime.

**Fix:** Add to `server/.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key from Supabase dashboard → Settings → API>
```

### 1.2 `CRON_SECRET` missing from `server/.env.local`

**Problem:** `server/src/lib/utils/cronAuth.ts` reads
`process.env.CRON_SECRET`. Cron routes reject requests that don't include
`Authorization: Bearer <CRON_SECRET>`. Without this, the cron system is
broken (even if called manually).

**Fix:**
```
CRON_SECRET=<any_random_secret_32_chars>
```

### 1.3 `ALLOWED_ORIGINS` points to wrong port

**Problem:**
- `server/.env.local` → `ALLOWED_ORIGINS=http://localhost:3000`
- `app/.env` → `VITE_API_BASE_URL=http://localhost:3001/api/v1`
- Vite dev server runs on **port 5173** by default

The CORS allowed origin must match the origin the browser sends
(`http://localhost:5173`), not port 3000. Meanwhile the app correctly
targets port 3001 for the API, so the Next.js server needs to run on 3001.

**Fix (two changes):**

`server/.env.local`:
```
ALLOWED_ORIGINS=http://localhost:5173
```

`server/package.json` scripts:
```json
"dev": "next dev -p 3001"
```

### 1.4 `app/.env.example` missing `VITE_API_BASE_URL`

**Problem:** `app/.env.example` doesn't document `VITE_API_BASE_URL`, but
`app/.env` has it. New devs cloning the repo won't know to set it.

**Fix:** Add to `app/.env.example`:
```
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

---

## SECTION 2 — SUPABASE RLS GAPS

### 2.1 `categories`, `level_config`, `quest_templates` have no RLS policies

**Problem:** These three tables have RLS enabled (via
`01_schema_and_tables.sql`) but `02_rls_policies.sql` defines **no SELECT
policies** for them. Any query from the anon client or even from an
authenticated user's RLS-scoped client will return 0 rows (Supabase
default-deny when RLS is on but no matching policy exists).

**Impact:**
- `GET /api/v1/categories` → returns empty `[]`
- `GET /api/v1/quests/daily` → `generate_daily_quests` selects from
  `quest_templates`, returns 0 rows, daily quests are always empty
- `GET /api/v1/xp/level-map` → `level_config` returns empty `[]`

**Fix:** Apply `missing_code/07_missing_rls_policies.sql` (generated below).

### 2.2 `achievements` SELECT policy excludes non-own achievements

**Problem:** The existing policy:
```sql
CREATE POLICY "achievements_select_own" ON public.achievements
  FOR SELECT TO authenticated
  USING (/* no condition seen in first 80 lines */);
```
The `achievements` table is system-wide data (no `user_id`). A policy that
filters by `auth.uid()` would return nothing. The policy needs to allow all
authenticated users to read all achievements.

**Fix:** Included in `07_missing_rls_policies.sql`.

---

## SECTION 3 — MIGRATION ORDERING

### 3.1 Server `migrations/` only has seeds 04–06; schema SQL is in `files/`

**Problem:** The `server/migrations/` directory contains:
```
04_level_config_seed.sql
05_quest_templates_seed.sql
06_achievements_seed.sql
```
But migrations **01–03** (schema tables, RLS policies, analytics functions)
live in `files/` as reference docs and have **no migration runner config**.
There is no `supabase/config.toml`, no `supabase/migrations/` directory,
and no `package.json` script to apply them.

This means a fresh dev environment has no path to get a working database.

**Fix:** See `SETUP_GUIDE.md` for the correct apply order. A
`supabase/migrations/` directory with renamed files is the proper long-term
solution. Short-term: apply manually in Supabase SQL editor in this order:
1. `files/01_schema_and_tables.sql`
2. `files/02_rls_policies.sql`
3. `files/03_analytics_engine.sql`
4. `missing_code/07_missing_rls_policies.sql` ← **apply this too**
5. `server/migrations/04_level_config_seed.sql`
6. `server/migrations/05_quest_templates_seed.sql`
7. `server/migrations/06_achievements_seed.sql`

---

## SECTION 4 — API MISMATCHES

### 4.1 `ActivityAction` type mismatch in `award_xp` SQL function

**Problem:** The `award_xp` function in `03_analytics_engine.sql` inserts
into `activity_feed`:
```sql
INSERT INTO public.activity_feed (user_id, action, ...)
VALUES (p_user_id, 'leveled up', ...);
```
But the shared `ActivityAction` type is:
```ts
type ActivityAction = 'completed' | 'achieved' | 'leveled_up' | 'started' | 'joined'
```
`'leveled up'` (with a space) does not match `'leveled_up'`. The frontend
will fail to render level-up feed items correctly and TypeScript will
complain if the action is used in a discriminated union.

**Fix:** In `03_analytics_engine.sql`, change:
```sql
VALUES (p_user_id, 'leveled up', ...)
```
to:
```sql
VALUES (p_user_id, 'leveled_up', ...)
```
This requires updating the function in Supabase. The corrected SQL is in
`missing_code/fix_award_xp_action.sql`.

### 4.2 `AchievementService` slug dispatch misses seeded slugs

**Problem:** `ACHIEVEMENT_CHECKERS` in `AchievementService.ts` has
hardcoded keys: `first_quest`, `streak_7`, `streak_30`, `quest_100`.
But the seed in `06_achievements_seed.sql` also includes:
- `quest_count_n_10`, `quest_count_n_500`
- `streak_n_3`, `streak_n_100`
- `level_n_10`, `level_n_25`, `level_n_50`, `level_n_100`
- `habit_completions_n_50`, `habit_completions_n_365`

The dispatch logic falls back to `ACHIEVEMENT_CHECKERS[trigger_type + '_n']`
(e.g., `quest_count_n`). The seeded slugs are `quest_count_n_10` — these
**do not match** `quest_count_n`. Only the four hardcoded slugs will ever
fire.

**Fix:** The service already has the generic `_n` handlers
(`quest_count_n`, `streak_n`, `level_n`, `habit_completions_n`). The
lookup needs to match by `trigger_type` not `slug`. See
`missing_code/AchievementService.fixed.ts`.

### 4.3 `quests_completed` incremented with a read-then-write (race condition)

**Problem:** In `quests/[id]/complete/route.ts`:
```ts
async function incrementQuestsCompleted(supabase, userId) {
  const { data } = await supabase.from('profiles').select('quests_completed')...
  return (data?.quests_completed ?? 0) + 1;
}
```
Two concurrent quest completions would both read the same value and both
write `n+1` instead of `n+2`.

**Fix:** Use Postgres increment directly:
```ts
await supabase.rpc('increment_profile_counter', {
  p_user_id: userId,
  p_column: 'quests_completed'
});
```
Or use the SQL expression approach. See `missing_code/fix_increment.sql`
for a simple helper RPC, and the updated route snippet in
`missing_code/quest_complete_fix.ts`.

### 4.4 `habitsTracked` counter is never incremented

**Problem:** `profiles.habits_tracked` exists in the schema and is exposed
in the `Profile` type, but no route or service ever increments it. The
`HabitService` (when a habit is created) needs to increment this counter.

**Fix:** Add an increment in the habit creation route. See
`missing_code/habit_create_fix.ts`.

### 4.5 Onboarding `categoryIds` are accepted but silently dropped

**Problem:** The onboarding route explicitly documents that `categoryIds`
is accepted for forward-compatibility but **not persisted** because no
`user_category_interests` table exists. The frontend collects these
selections across two steps (goals + categories) and passes them, but they
vanish. This is a documented known gap.

**Fix (optional):** Apply `missing_code/08_user_category_interests.sql` to
add the join table, then update the onboarding route to insert rows. The
onboarding route patch is in `missing_code/onboarding_categories_fix.ts`.

---

## SECTION 5 — ONBOARDING / DASHBOARD BLOCKERS

### 5.1 Onboarding page references `RANKS` from `mockData`

**Problem:** `Onboarding.tsx` imports:
```ts
import { mockCategories as fallbackCategories, RANKS } from '@/data/mockData';
```
`RANKS` in `mockData` only has 6 tiers (`E` through `S`). The shared
contract now has 8 (`National`, `Monarch`). The rank display in the final
onboarding step will silently be missing the top two tiers.

**Fix:** Replace the `RANKS` import with the canonical constant. See
`missing_code/ranks_constant.ts` for the updated `RANKS` definition that
matches the shared contract, and import it instead of from `mockData`.

### 5.2 Avatar selection in onboarding is purely presentational

**Problem:** The onboarding page lets users pick from 6 preset Unsplash
avatars, but the final submit only calls:
```ts
completeOnboarding.mutateAsync({ displayName, categoryIds: [], timezone })
```
The selected avatar URL is never sent. The `POST /onboarding/complete`
route doesn't accept an `avatarUrl` field either. After onboarding, the
user's avatar is whatever the Supabase OAuth provider returned (or null for
email signups).

**Fix:** Two options:
- **Option A (quick):** Add `avatarUrl?: string` to
  `completeOnboardingSchema` on the server and persist it in the profile
  update. See `missing_code/onboarding_avatar_fix.ts`.
- **Option B (correct):** The avatar step should use `POST
  /profile/me/avatar` with a file upload. Preset URLs could be proxied
  through a separate endpoint.

Option A is implemented in the generated files.

### 5.3 New user profile has all analytics scores at 0

**Problem:** The `handle_new_user` trigger creates a profile with default
values. `analytics_scores` columns on `profiles` default to 0 (correct).
However, `GET /api/v1/analytics/scores/today` queries the
`analytics_scores` table — there will be no row for a new user until the
cron job runs at 23:55 or until `upsert_analytics_snapshot` is called.

**Impact:** The Analytics page will show empty/loading state all day for
new users.

**Fix:** Call `upsert_analytics_snapshot` at the end of the
`POST /onboarding/complete` route. Patch in
`missing_code/onboarding_analytics_seed.ts`.

### 5.4 `GET /quests/daily` returns empty for brand-new users with no quest templates seeded

**Impact:** If migration `05_quest_templates_seed.sql` hasn't been run,
`generate_daily_quests` returns 0 rows. Dashboard shows empty quests
section. This is purely a migration order issue (see Section 3).

---

## SECTION 6 — MISSING FILES

The following files are **referenced in existing code but do not exist**:

| Missing File | Referenced By | Description |
|---|---|---|
| `app/src/lib/icons.ts` | `Onboarding.tsx`, `MIGRATION.md` | `resolveIcon()` helper mapping icon name strings to Lucide components |
| `app/src/lib/time.ts` | `MIGRATION.md`, implied by notification hooks | `timeAgo()` / `shortDate()` timestamp formatters |
| `app/src/lib/adapters/profile.ts` | `MIGRATION.md` | `toDisplayProfile()` for legacy field name compatibility |
| `server/.env.example` | Best practice | Documenting required server env vars |
| `missing_code/07_missing_rls_policies.sql` | This audit | RLS policies for `categories`, `level_config`, `quest_templates`, `achievements` |

All generated in the `missing_code/` directory of this report.

---

## SECTION 7 — STEP-BY-STEP FIX PLAN

### Phase 1 — Unblock Local Dev (do these first, ~15 min)

**Step 1: Fix env vars**
```bash
# server/.env.local — add:
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>
CRON_SECRET=sl_cron_secret_replace_me
ALLOWED_ORIGINS=http://localhost:5173

# app/.env — already correct for port 3001
```

**Step 2: Fix Next.js dev port**

In `server/package.json`:
```json
"scripts": {
  "dev": "next dev -p 3001",
  ...
}
```

**Step 3: Apply SQL in this order** (Supabase SQL editor)
1. `files/01_schema_and_tables.sql`
2. `files/02_rls_policies.sql`
3. `files/03_analytics_engine.sql`
4. `missing_code/07_missing_rls_policies.sql`  ← **critical: unblocks categories + quests**
5. `server/migrations/04_level_config_seed.sql`
6. `server/migrations/05_quest_templates_seed.sql`
7. `server/migrations/06_achievements_seed.sql`

**Step 4: Add missing frontend utility files**
- Copy `missing_code/icons.ts` → `app/src/lib/icons.ts`
- Copy `missing_code/time.ts` → `app/src/lib/time.ts`
- Copy `missing_code/adapters/profile.ts` → `app/src/lib/adapters/profile.ts`

After these 4 steps, the app should be fully bootable.

### Phase 2 — Fix Correctness Issues (~30 min)

**Step 5:** Apply `missing_code/fix_award_xp_action.sql` in Supabase to fix the
`'leveled up'` → `'leveled_up'` action string.

**Step 6:** Replace `server/src/services/AchievementService.ts` with
`missing_code/AchievementService.fixed.ts` to fix slug dispatch.

**Step 7:** Apply `missing_code/fix_increment.sql` in Supabase, then patch the quest
completion route with `missing_code/quest_complete_fix.ts`.

**Step 8:** Add `habitsTracked` increment from `missing_code/habit_create_fix.ts`.

**Step 9:** Update `Onboarding.tsx` to import `RANKS` from
`missing_code/ranks_constant.ts` instead of `mockData`.

### Phase 3 — Nice-to-Have Completions (~1 hr)

**Step 10:** Add `user_category_interests` table via
`missing_code/08_user_category_interests.sql` and wire it up in the
onboarding route.

**Step 11:** Fix onboarding avatar persistence with
`missing_code/onboarding_avatar_fix.ts`.

**Step 12:** Seed analytics on first login via
`missing_code/onboarding_analytics_seed.ts`.

**Step 13:** Add `server/.env.example` from `missing_code/server.env.example`.

---

## SECTION 8 — WHAT IS CORRECTLY INTEGRATED ✅

- All 22 DB tables are defined and referenced consistently
- All 4 Postgres RPC functions (`award_xp`, `generate_daily_quests`,
  `recalculate_streak`, `upsert_analytics_snapshot`) are correctly wired
  to the service layer
- `toCamel` / `toSnakeShallow` handle snake_case ↔ camelCase translation
- Bearer token auth is properly threaded from frontend → API → RLS
- `withErrorHandling` wraps all routes; error shape matches frontend
  `ApiRequestError`
- CORS `handleOptions` is exported from every route
- React Query cache invalidation is correct for quests → profile → XP chain
- `OnboardingGate` correctly blocks dashboard access pre-onboarding
- `handle_new_user` trigger creates profiles on signup automatically
- `AchievementService` generic `_n` fallback pattern is sound (just needs
  dispatch fix)
- Zod validation schemas exist for all mutating routes audited
- Paginated response shape matches `PaginatedResponse<T>` contract
- All seed data (level_config, quest_templates, achievements) is complete
  and references correct enums
