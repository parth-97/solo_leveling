-- ============================================================
-- SOLO LEVELING — MISSING RLS POLICIES
-- Apply after 02_rls_policies.sql
--
-- These three tables have RLS enabled but zero SELECT policies,
-- meaning every query returns 0 rows by default (Supabase deny-all).
-- ============================================================

-- ─────────────────────────────────────────
-- CATEGORIES (system-wide, read-only for all authenticated users)
-- ─────────────────────────────────────────
CREATE POLICY "categories_select_all"
  ON public.categories FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────
-- LEVEL_CONFIG (system-wide, read-only)
-- ─────────────────────────────────────────
CREATE POLICY "level_config_select_all"
  ON public.level_config FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────
-- QUEST_TEMPLATES (system-wide, read-only)
-- Required by generate_daily_quests() RPC which runs SECURITY DEFINER,
-- but also queried directly from authenticated clients.
-- ─────────────────────────────────────────
CREATE POLICY "quest_templates_select_all"
  ON public.quest_templates FOR SELECT
  TO authenticated
  USING (true);

-- ─────────────────────────────────────────
-- ACHIEVEMENTS (system-wide, read-only)
-- The existing policy name is "achievements_select_own" but achievements
-- have no user_id column — it's a system catalogue.
-- Drop the misnamed policy (if it exists) and replace it.
-- ─────────────────────────────────────────
DROP POLICY IF EXISTS "achievements_select_own" ON public.achievements;

CREATE POLICY "achievements_select_all"
  ON public.achievements FOR SELECT
  TO authenticated
  USING (true);
