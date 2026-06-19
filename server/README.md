# Solo Leveling — Backend API

Next.js (App Router) project implementing the 60+ REST endpoints specified
in `files/05_api_and_services.ts`, against the Supabase schema in
`files/01_schema_and_tables.sql` / `02_rls_policies.sql` / `03_analytics_engine.sql`.

This is a separate project from `app/` (the Vite frontend). The frontend
calls this API via `VITE_API_BASE_URL` (see `app/.env.example`).

## Setup

1. `cp .env.example .env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (server-only, never exposed)
   - `CRON_SECRET` — random string for `/api/internal/cron/*` auth
   - `ALLOWED_ORIGINS` — comma-separated list including the Vite dev URL

2. Run the SQL migrations against your Supabase project, in order:
   - `files/01_schema_and_tables.sql`
   - `files/02_rls_policies.sql`
   - `files/03_analytics_engine.sql`
   - `migrations/04_level_config_seed.sql` — fills in `level_config` rows
     for levels 6-149 (the spec only seeds anchor levels) via geometric
     interpolation between the spec's anchor points; idempotent.
   - `migrations/05_quest_templates_seed.sql` — seeds ~30 quest templates
     across all 8 system categories so `generate_daily_quests` has rows
     to select from.
   - `migrations/06_achievements_seed.sql` — seeds 14 achievements whose
     `slug`/`trigger_type` match the checkers in
     `src/services/AchievementService.ts`.

3. Create a public Supabase Storage bucket named `avatars` (used by
   `POST /api/v1/profile/me/avatar`).

4. `npm install && npm run dev`

## Architecture notes

- **Auth**: every `/api/v1/*` route (except none — all require auth)
  calls `requireAuth()` (`src/lib/utils/auth.ts`), which resolves the
  Supabase user from the `Authorization: Bearer <access_token>` header
  sent by the frontend's `apiFetch`, and returns an RLS-scoped Supabase
  client. All data queries go through this client so Postgres RLS
  policies (`files/02_rls_policies.sql`) are the source of truth for
  authorization — route handlers add 404/403 checks mainly for clean
  error messages, not as the primary security boundary.

- **Admin client** (`src/lib/supabase/admin.ts`, service-role key):
  used only by `/api/internal/cron/*` routes, which bypass RLS to
  iterate over all users.

- **XP / streaks / achievements**: `src/services/XpService.ts` wraps the
  `award_xp` and `recalculate_streak` SQL functions. `src/services/
  AchievementService.ts` checks and unlocks achievements after any
  XP-earning action (quest/habit/goal/challenge completion).

- **camelCase mapping**: Postgres columns are snake_case; the frontend
  contract (`src/types/shared.ts`, `src/types/api.ts` — copied from the
  `app/` project, see below) is camelCase. `src/lib/utils/case.ts`
  converts between them.

- **Response envelopes**: `src/lib/utils/response.ts` produces
  `{ data, meta? }` (`ApiResponse<T>` / `PaginatedResponse<T>`) on
  success and `{ error: { code, message, statusCode, details? } }` on
  failure, matching `app/src/lib/api/client.ts`'s parsing.

- **CORS**: every route exports `OPTIONS = handleOptions` and applies
  `corsHeaders()` based on `ALLOWED_ORIGINS`, since the Vite frontend
  runs on a different origin.

## Known gaps / deliberate simplifications

- **`categoryIds` in onboarding** (`POST /onboarding/complete`) is
  accepted but not persisted — no table exists for per-user category
  interests. See the route's docstring for the suggested schema addition.

- **XP clawback on habit-log undo**: `DELETE /habits/:id/log/:date`
  does not reverse previously-awarded XP (the `xp_transactions` ledger
  is documented as immutable). Only streaks/completion counts are
  recalculated.

- **AI Insights** (`src/services/InsightService.ts`) use rule-based
  heuristics, not an LLM. The schema/docs reference "AI-generated"
  insights but specify no provider; swapping in a real LLM call is a
  contained change to that one file.

- **`xp/summary`** sums the full `xp_transactions` table client-side to
  compute today/week/month/all-time — fine at small scale, but would
  benefit from a date-bucketed SQL aggregate at larger scale.

- **Leaderboard snapshots**: `/api/internal/cron/leaderboard` rebuilds
  `leaderboard_snapshots`; `GET /leaderboard` falls back to an on-the-fly
  computation if no snapshot exists yet for the current period.

- **Duplicated types**: `src/types/shared.ts` and `src/types/api.ts`
  are copied from `app/src/types/`. Keep both in sync, or extract to a
  shared workspace package if this becomes a monorepo.

- **Push/email notification delivery**: `src/services/NotificationService.ts`
  inserts DB rows only; actual push/email delivery (referenced in
  `files/06_security_and_scalability.md`) is a documented extension point.
