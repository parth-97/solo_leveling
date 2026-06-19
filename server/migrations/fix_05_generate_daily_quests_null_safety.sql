-- Fix: generate_daily_quests had two latent bugs that can each cause it
-- to silently insert 0 rows even when quest_templates is fully seeded:
--
-- 1. `qt.id NOT IN (SELECT template_id FROM daily_quests WHERE ...)` —
--    classic Postgres NULL trap. If that subquery ever returns even one
--    NULL template_id (e.g. a manually-tested row, or a quest whose
--    template was later deleted via ON DELETE SET NULL), `NOT IN`
--    evaluates to NULL for every comparison, and the WHERE clause excludes
--    every single template_id. Replaced with NOT EXISTS, which has no
--    such trap.
--
-- 2. `v_level` was left NULL if no matching profiles row was found for
--    p_user_id (or if level was somehow null), which made
--    `qt.min_level <= v_level` evaluate to NULL (excluded) for every row.
--    Now defaults to 1 via COALESCE.

CREATE OR REPLACE FUNCTION public.generate_daily_quests(
  p_user_id UUID,
  p_date    DATE DEFAULT CURRENT_DATE,
  p_count   INT  DEFAULT 5
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_level   INT;
  v_tz      TEXT;
  v_expires TIMESTAMPTZ;
  v_inserted INT := 0;
BEGIN
  SELECT level, timezone INTO v_level, v_tz
  FROM public.profiles WHERE id = p_user_id;

  v_level := COALESCE(v_level, 1);

  -- Expire at midnight in user's timezone
  v_expires := (p_date + 1)::TIMESTAMPTZ AT TIME ZONE COALESCE(v_tz, 'UTC');

  -- Insert p_count quests selected by weighted random, matching user's level range
  INSERT INTO public.daily_quests
    (user_id, template_id, title, description, category_id, difficulty, xp_reward, quest_date, expires_at)
  SELECT
    p_user_id,
    qt.id,
    qt.title,
    qt.description,
    qt.category_id,
    qt.difficulty,
    -- Scale XP by level multiplier
    ROUND(qt.xp_reward * COALESCE(lc.xp_multiplier, 1.0))::INT,
    p_date,
    v_expires
  FROM public.quest_templates qt
  LEFT JOIN public.level_config lc ON lc.level = v_level
  WHERE qt.is_active = true
    AND qt.min_level <= v_level
    AND (qt.max_level IS NULL OR qt.max_level >= v_level)
    -- Exclude already assigned today (NOT EXISTS — NULL-safe, unlike NOT IN)
    AND NOT EXISTS (
      SELECT 1 FROM public.daily_quests dq
      WHERE dq.user_id = p_user_id
        AND dq.quest_date = p_date
        AND dq.template_id = qt.id
    )
  ORDER BY RANDOM() * qt.weight DESC
  LIMIT p_count
  ON CONFLICT (user_id, template_id, quest_date) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;
