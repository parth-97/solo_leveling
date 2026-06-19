-- ─────────────────────────────────────────────────────────────────────────────
-- fix_08_xp_deduction_analytics.sql
--
-- BUG: xp_earned_today in both compute_scores() and upsert_analytics_snapshot()
-- filtered xp_transactions with `amount > 0`, meaning XP deductions (e.g. from
-- deleting a habit) were invisible.  The Analytics page "Weekly XP" bar and the
-- Dashboard "+N XP" figure never reflected the deduction.
--
-- FIX: Use SUM(amount) without the positive-only filter so the net XP for the
-- day is shown.  GREATEST(..., 0) keeps the value non-negative on the rare day
-- where a user deducts more XP than they earned (e.g. they delete a completed
-- habit on the same day they earned it).
--
-- ALSO FIXED: upsert_analytics_snapshot had the same amount > 0 filter on its
-- own local xp_today variable — patched identically below.
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. compute_scores ────────────────────────────────────────────────────────
-- Postgres raises 42P13 if you CREATE OR REPLACE a function and the parameter
-- list differs from the existing one (including defaults). DROP first.
DROP FUNCTION IF EXISTS public.compute_scores(UUID, DATE);

CREATE OR REPLACE FUNCTION public.compute_scores(p_user_id UUID, p_date DATE)
RETURNS TABLE (
  life_score NUMERIC, discipline_score NUMERIC, growth_score NUMERIC,
  health_score NUMERIC, learning_score NUMERIC, productivity_score NUMERIC,
  relationship_score NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_q_done INT; v_q_total INT;
  v_h_done INT; v_h_total INT;
  v_hr_fitness NUMERIC; v_hr_mindfulness NUMERIC;
  v_hr_learning NUMERIC; v_hr_social NUMERIC;
  v_learning_q_done INT; v_learning_q_tot INT;
  v_streak INT; v_level INT; v_achievements INT;
  v_xp_today NUMERIC; v_xp_7d_avg NUMERIC;
  v_goal_prog NUMERIC;
  r_health      NUMERIC;
  r_discipline  NUMERIC;
  r_productivity NUMERIC;
  r_learning    NUMERIC;
  r_growth      NUMERIC;
  r_relationship NUMERIC;
  r_life        NUMERIC;
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

  -- ── XP earned today (NET — includes deductions from habit/goal deletes) ───
  -- FIX: removed `AND amount > 0` so negative transactions (XP deductions)
  -- are included.  GREATEST keeps the displayed value at 0 on heavy-deduction
  -- days rather than going negative.
  SELECT GREATEST(COALESCE(SUM(amount), 0), 0)
  INTO v_xp_today
  FROM public.xp_transactions
  WHERE user_id = p_user_id
    AND DATE(created_at) = p_date;

  -- ── XP 7-day rolling average (net per day) ────────────────
  -- FIX: same — remove amount > 0 so averages reflect actual net XP.
  SELECT COALESCE(AVG(daily_xp), 50)
  INTO v_xp_7d_avg
  FROM (
    SELECT DATE(created_at) AS d, GREATEST(SUM(amount), 0) AS daily_xp
    FROM public.xp_transactions
    WHERE user_id = p_user_id
      AND created_at >= p_date - INTERVAL '7 days'
    GROUP BY 1
  ) sub;

  -- ── Average goal progress ─────────────────────────────────
  SELECT COALESCE(AVG(progress), 0)
  INTO v_goal_prog
  FROM public.goals
  WHERE user_id = p_user_id AND status = 'active';

  -- ── Score formulae (unchanged) ────────────────────────────
  r_health       := LEAST(100, ROUND(
    (v_hr_fitness * 50) + (v_hr_mindfulness * 30) +
    (CASE WHEN v_streak > 0 THEN 20 ELSE 0 END)
  ));

  r_discipline   := LEAST(100, ROUND(
    (CASE WHEN v_h_total > 0 THEN (v_h_done::NUMERIC / v_h_total) * 60 ELSE 0 END) +
    (CASE WHEN v_streak >= 7  THEN 20
          WHEN v_streak >= 3  THEN 10
          ELSE 0 END) +
    (CASE WHEN v_q_total > 0 THEN (v_q_done::NUMERIC / v_q_total) * 20 ELSE 0 END)
  ));

  r_productivity := LEAST(100, ROUND(
    (CASE WHEN v_q_total > 0 THEN (v_q_done::NUMERIC / v_q_total) * 50 ELSE 0 END) +
    (CASE WHEN v_xp_7d_avg > 0
      THEN LEAST(30, (v_xp_today / v_xp_7d_avg) * 30)
      ELSE 0 END) +
    (v_goal_prog * 20)
  ));

  r_learning     := LEAST(100, ROUND(
    (v_hr_learning * 40) +
    (CASE WHEN v_learning_q_tot > 0
      THEN (v_learning_q_done::NUMERIC / v_learning_q_tot) * 40 ELSE 0 END) +
    (LEAST(v_level, 5) * 4)
  ));

  r_growth       := LEAST(100, ROUND(
    (LEAST(v_achievements, 10) * 5) +
    (LEAST(v_level, 10) * 3) +
    (CASE WHEN v_streak >= 30 THEN 20
          WHEN v_streak >= 14 THEN 15
          WHEN v_streak >= 7  THEN 10
          WHEN v_streak >= 3  THEN 5
          ELSE 0 END) +
    (v_goal_prog * 20)
  ));

  r_relationship := LEAST(100, ROUND(
    (v_hr_social * 60) +
    (LEAST(v_achievements, 5) * 5) +
    (CASE WHEN v_streak >= 7 THEN 15 ELSE v_streak * 2 END)
  ));

  r_life         := ROUND(
    (r_health * 0.20) + (r_discipline * 0.25) + (r_productivity * 0.20) +
    (r_learning * 0.15) + (r_growth * 0.10) + (r_relationship * 0.10)
  );

  RETURN QUERY SELECT r_life, r_discipline, r_growth, r_health, r_learning, r_productivity, r_relationship;
END;
$$;


-- ── 2. upsert_analytics_snapshot ─────────────────────────────────────────────
-- Same net-XP fix in the local v_xp_today variable inside this function.
DROP FUNCTION IF EXISTS public.upsert_analytics_snapshot(UUID, DATE);

CREATE OR REPLACE FUNCTION public.upsert_analytics_snapshot(p_user_id UUID, p_date DATE)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_scores RECORD;
  v_q_done INT;
  v_q_total INT;
  v_h_done INT;
  v_h_total INT;
  v_streak INT;
  v_xp_today INT;
BEGIN
  SELECT * INTO v_scores FROM public.compute_scores(p_user_id, p_date);

  SELECT COUNT(*) FILTER (WHERE completed),
         COUNT(*)
  INTO v_q_done, v_q_total
  FROM public.daily_quests
  WHERE user_id = p_user_id AND quest_date = p_date;

  SELECT COUNT(*)
  INTO v_h_total
  FROM public.habits
  WHERE user_id = p_user_id AND is_active = true;

  SELECT COUNT(*)
  INTO v_h_done
  FROM public.habit_logs
  WHERE user_id = p_user_id AND logged_date = p_date AND completed = true;

  SELECT current_streak INTO v_streak
  FROM public.profiles WHERE id = p_user_id;

  -- FIX: removed `AND amount > 0` — deductions are now counted in the net sum.
  -- GREATEST keeps the value non-negative.
  SELECT GREATEST(COALESCE(SUM(amount), 0), 0) INTO v_xp_today
  FROM public.xp_transactions
  WHERE user_id = p_user_id AND DATE(created_at) = p_date;

  INSERT INTO public.analytics_scores (
    user_id, score_date,
    life_score, discipline_score, growth_score, health_score,
    learning_score, productivity_score, relationship_score,
    quests_done, quests_total, habits_done, habits_total,
    streak_days, xp_earned_today
  )
  VALUES (
    p_user_id, p_date,
    v_scores.life_score, v_scores.discipline_score, v_scores.growth_score,
    v_scores.health_score, v_scores.learning_score, v_scores.productivity_score,
    v_scores.relationship_score,
    v_q_done, v_q_total, v_h_done, v_h_total, v_streak, v_xp_today
  )
  ON CONFLICT (user_id, score_date) DO UPDATE SET
    life_score          = EXCLUDED.life_score,
    discipline_score    = EXCLUDED.discipline_score,
    growth_score        = EXCLUDED.growth_score,
    health_score        = EXCLUDED.health_score,
    learning_score      = EXCLUDED.learning_score,
    productivity_score  = EXCLUDED.productivity_score,
    relationship_score  = EXCLUDED.relationship_score,
    quests_done         = EXCLUDED.quests_done,
    quests_total        = EXCLUDED.quests_total,
    habits_done         = EXCLUDED.habits_done,
    habits_total        = EXCLUDED.habits_total,
    streak_days         = EXCLUDED.streak_days,
    xp_earned_today     = EXCLUDED.xp_earned_today,
    computed_at         = NOW();
END;
$$;
