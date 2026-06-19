-- ============================================================
-- SOLO LEVELING — MISSING INSERT / WRITE RLS POLICIES
-- Apply after 07_missing_rls_policies.sql
--
-- Three tables have RLS enabled with SELECT-only policies but are
-- written to by the authenticated (RLS-scoped) Supabase client in
-- the API server. Without INSERT policies every write silently
-- returns 0 rows — the authenticated client gets no error, but
-- nothing is persisted. Affected features:
--
--   user_achievements → achievements page always shows 0 unlocked
--   activity_feed     → postActivity() calls silently no-op
--   leaderboard_snapshots → leaderboard writes silently no-op
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- USER ACHIEVEMENTS
-- The achievement engine (AchievementService.ts) runs under the
-- authenticated client and inserts rows when the user qualifies.
-- Without this policy every insert is rejected by RLS and caught
-- silently as a "unique violation race" — achievements never unlock.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_achievements_insert_own" ON public.user_achievements;
CREATE POLICY "user_achievements_insert_own"
  ON public.user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- ACTIVITY FEED
-- postActivity() is called from quest completion, habit logging,
-- goal completion, and achievement unlocks. All run under the
-- authenticated client so they need an INSERT policy.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "feed_insert_own" ON public.activity_feed;
CREATE POLICY "feed_insert_own"
  ON public.activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ─────────────────────────────────────────────────────────────
-- LEADERBOARD SNAPSHOTS
-- Written by the leaderboard service under the authenticated client.
-- Without this policy leaderboard score writes silently fail.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "leaderboard_insert_own" ON public.leaderboard_snapshots;
CREATE POLICY "leaderboard_insert_own"
  ON public.leaderboard_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
