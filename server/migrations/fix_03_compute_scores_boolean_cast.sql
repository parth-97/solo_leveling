-- ============================================================
-- FIX: compute_scores() always throws "cannot cast type boolean
-- to integer" because it casts hl.completed / cp.completed
-- (boolean columns) directly to INT — Postgres has no built-in
-- cast for that. This is checked at parse time, so the function
-- fails on every call, for every user, regardless of data.
--
-- This breaks upsert_analytics_snapshot() (which calls
-- compute_scores), which means:
--   - GET /api/v1/analytics/scores/today  -> 500 (PGRST116)
--   - GET /api/v1/analytics/radar         -> 500 (PGRST116)
--   - no row ever gets written to analytics_scores, so
--     Weekly XP Gain / Monthly Progress / Skill Radar /
--     Category Breakdown all render empty.
--
-- The PGRST116 "Cannot coerce the result to a single JSON
-- object" you saw in the terminal is a downstream symptom, not
-- the root cause: the app code calls .single() on a SELECT after
-- the upsert RPC supposedly ran, finds 0 rows (because the RPC's
-- transaction was rolled back), and Supabase's PostgREST layer
-- reports that as PGRST116 instead of the real Postgres error.
--
-- Run this whole file once in the Supabase SQL Editor.
-- CREATE OR REPLACE is idempotent / safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.compute_scores(
  p_user_id   UUID,
  p_date      DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  life_score          NUMERIC,
  discipline_score    NUMERIC,
  growth_score        NUMERIC,
  health_score        NUMERIC,
  learning_score      NUMERIC,
  productivity_score  NUMERIC,
  relationship_score  NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_q_done          INT;
  v_q_total         INT;
  v_h_done          INT;
  v_h_total         INT;
  v_streak          INT;
  v_xp_today        INT;
  v_xp_7d_avg       NUMERIC;
  v_goal_prog       NUMERIC;
  v_level           INT;
  v_achievements    INT;
  v_friend_count    INT;
  v_friend_int      INT;
  v_challenge_p     NUMERIC;

  v_hr_fitness      NUMERIC;
  v_hr_mindfulness  NUMERIC;
  v_hr_learning     NUMERIC;
  v_hr_social       NUMERIC;
  v_learning_q_done INT;
  v_learning_q_tot  INT;

  r_discipline      NUMERIC;
  r_productivity    NUMERIC;
  r_health          NUMERIC;
  r_learning        NUMERIC;
  r_growth          NUMERIC;
  r_relationship    NUMERIC;
  r_life            NUMERIC;
BEGIN
  -- ── Quest counts ──────────────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE completed = true),
    COUNT(*)
  INTO v_q_done, v_q_total
  FROM public.daily_quests
  WHERE user_id = p_user_id AND quest_date = p_date;

  -- ── Habit counts ──────────────────────────────────────────
  SELECT COUNT(*)
  INTO v_h_total
  FROM public.habits
  WHERE user_id = p_user_id AND is_active = true;

  SELECT COUNT(*)
  INTO v_h_done
  FROM public.habit_logs hl
  JOIN public.habits h ON h.id = hl.habit_id
  WHERE hl.user_id = p_user_id
    AND hl.logged_date = p_date
    AND hl.completed = true;

  -- ── Category-specific habit rates ─────────────────────────
  -- FIX: Postgres has no built-in cast from boolean to integer
  -- ("cannot cast type boolean to integer"). Use CASE instead of
  -- hl.completed::INT. NULL is preserved (no log that day) so AVG
  -- still ignores days with no habit_logs row, same as intended.
  SELECT
    COALESCE(
      AVG(CASE WHEN c.slug = 'fitness'
        THEN (CASE hl.completed WHEN TRUE THEN 1 WHEN FALSE THEN 0 ELSE NULL END)::NUMERIC ELSE NULL END), 0),
    COALESCE(
      AVG(CASE WHEN c.slug = 'mindfulness'
        THEN (CASE hl.completed WHEN TRUE THEN 1 WHEN FALSE THEN 0 ELSE NULL END)::NUMERIC ELSE NULL END), 0),
    COALESCE(
      AVG(CASE WHEN c.slug = 'learning'
        THEN (CASE hl.completed WHEN TRUE THEN 1 WHEN FALSE THEN 0 ELSE NULL END)::NUMERIC ELSE NULL END), 0),
    COALESCE(
      AVG(CASE WHEN c.slug = 'social'
        THEN (CASE hl.completed WHEN TRUE THEN 1 WHEN FALSE THEN 0 ELSE NULL END)::NUMERIC ELSE NULL END), 0)
  INTO v_hr_fitness, v_hr_mindfulness, v_hr_learning, v_hr_social
  FROM public.habits h
  JOIN public.categories c ON c.id = h.category_id
  LEFT JOIN public.habit_logs hl ON hl.habit_id = h.id AND hl.logged_date = p_date
  WHERE h.user_id = p_user_id AND h.is_active = true;

  -- ── Learning quest counts ──────────────────────────────────
  SELECT
    COUNT(*) FILTER (WHERE dq.completed = true),
    COUNT(*)
  INTO v_learning_q_done, v_learning_q_tot
  FROM public.daily_quests dq
  JOIN public.categories c ON c.id = dq.category_id
  WHERE dq.user_id = p_user_id
    AND dq.quest_date = p_date
    AND c.slug = 'learning';

  -- ── Profile stats ─────────────────────────────────────────
  SELECT current_streak, level, achievements_count
  INTO v_streak, v_level, v_achievements
  FROM public.profiles
  WHERE id = p_user_id;

  -- ── XP earned today ───────────────────────────────────────
  SELECT COALESCE(SUM(amount), 0)
  INTO v_xp_today
  FROM public.xp_transactions
  WHERE user_id = p_user_id
    AND DATE(created_at) = p_date
    AND amount > 0;

  -- ── XP 7-day rolling average ──────────────────────────────
  SELECT COALESCE(AVG(daily_xp), 50)
  INTO v_xp_7d_avg
  FROM (
    SELECT DATE(created_at) AS d, SUM(amount) AS daily_xp
    FROM public.xp_transactions
    WHERE user_id = p_user_id
      AND created_at >= p_date - INTERVAL '7 days'
      AND amount > 0
    GROUP BY 1
  ) sub;

  -- ── Average goal progress ─────────────────────────────────
  SELECT COALESCE(AVG(progress), 0)
  INTO v_goal_prog
  FROM public.goals
  WHERE user_id = p_user_id AND status = 'active';

  -- ── Friend count & interactions ───────────────────────────
  SELECT COUNT(*)
  INTO v_friend_count
  FROM public.friendships
  WHERE status = 'accepted'
    AND (requester_id = p_user_id OR addressee_id = p_user_id);

  SELECT COALESCE(COUNT(DISTINCT
    CASE WHEN af.user_id != p_user_id THEN af.user_id ELSE NULL END), 0)
  INTO v_friend_int
  FROM public.activity_feed af
  JOIN public.friendships f ON f.status = 'accepted'
    AND ((f.requester_id = p_user_id AND f.addressee_id = af.user_id)
      OR (f.addressee_id = p_user_id AND f.requester_id = af.user_id))
  WHERE af.created_at >= p_date - INTERVAL '7 days';

  -- ── Challenge completion rate (this month) ────────────────
  -- FIX: same boolean->int cast issue as above.
  SELECT COALESCE(
    AVG((CASE WHEN cp.completed THEN 1 ELSE 0 END)::NUMERIC), 0)
  INTO v_challenge_p
  FROM public.challenge_participants cp
  JOIN public.challenges ch ON ch.id = cp.challenge_id
  WHERE cp.user_id = p_user_id
    AND ch.end_date >= DATE_TRUNC('month', p_date)::DATE;

  -- ═══════════════════════════════════════════════════════════
  -- COMPUTE SCORES
  -- ═══════════════════════════════════════════════════════════

  -- 1. Discipline
  r_discipline := LEAST(
    (  (v_q_done::NUMERIC / GREATEST(v_q_total, 1)) * 100 * 0.4
     + (v_h_done::NUMERIC / GREATEST(v_h_total, 1)) * 100 * 0.4
     + LEAST(v_streak::NUMERIC / 30.0, 1.0) * 20
    ), 100
  );

  -- 2. Productivity
  r_productivity := LEAST(
    (  (v_q_done::NUMERIC / GREATEST(v_q_total, 1)) * 100 * 0.5
     + LEAST((v_xp_today::NUMERIC / GREATEST(v_xp_7d_avg, 50)) * 100, 150) * 0.3
     + (v_goal_prog / 100.0) * 20
    ), 100
  );

  -- 3. Health
  r_health := LEAST(
    (v_hr_fitness * 70 + v_hr_mindfulness * 30),
    100
  );

  -- 4. Learning
  r_learning := LEAST(
    (  v_hr_learning * 60
     + (v_learning_q_done::NUMERIC / GREATEST(v_learning_q_tot, 1)) * 40
    ), 100
  );

  -- 5. Growth
  r_growth := LEAST(
    (  LEAST(v_level::NUMERIC / 100.0, 1.0) * 40
     + (v_goal_prog / 100.0) * 40
     + LEAST(v_achievements::NUMERIC / 50.0, 1.0) * 20
    ), 100
  );

  -- 6. Relationship
  r_relationship := LEAST(
    (  LEAST(v_friend_count::NUMERIC / 10.0, 1.0) * 40
     + LEAST(v_friend_int::NUMERIC / 10.0, 1.0) * 40
     + v_challenge_p * 20
    ), 100
  );

  -- 7. Life Score (weighted composite)
  r_life := ROUND(
      r_discipline   * 0.25
    + r_productivity * 0.20
    + r_health       * 0.20
    + r_learning     * 0.15
    + r_growth       * 0.10
    + r_relationship * 0.10
  );

  RETURN QUERY SELECT
    ROUND(r_life, 2),
    ROUND(r_discipline, 2),
    ROUND(r_growth, 2),
    ROUND(r_health, 2),
    ROUND(r_learning, 2),
    ROUND(r_productivity, 2),
    ROUND(r_relationship, 2);
END;
$$;
