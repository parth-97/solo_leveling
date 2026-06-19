-- Fix: generate_daily_quests crashes with "time zone ... not recognized"
-- (Postgres error 22023) if a profile's `timezone` column ever contains a
-- string that isn't a real IANA zone identifier (e.g. "Asia/New delhi"
-- instead of "Asia/Kolkata"). That's a hard error inside AT TIME ZONE,
-- which previously aborted the whole function with zero quests generated
-- and no rows inserted.
--
-- This version validates v_tz against pg_timezone_names before using it,
-- falling back to UTC for anything invalid, so bad data in one column
-- can never block quest generation again.

CREATE OR REPLACE FUNCTION public.generate_daily_quests(
  p_user_id UUID,
  p_date    DATE DEFAULT CURRENT_DATE,
  p_count   INT  DEFAULT 5
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_level     INT;
  v_tz        TEXT;
  v_safe_tz   TEXT;
  v_expires   TIMESTAMPTZ;
  v_inserted  INT := 0;
BEGIN
  SELECT level, timezone INTO v_level, v_tz
  FROM public.profiles WHERE id = p_user_id;

  v_level := COALESCE(v_level, 1);

  -- Validate the stored timezone is a real IANA zone; fall back to UTC
  -- rather than letting a bad string crash the whole function.
  SELECT name INTO v_safe_tz FROM pg_timezone_names WHERE name = v_tz;
  v_safe_tz := COALESCE(v_safe_tz, 'UTC');

  -- Expire at midnight in user's timezone
  v_expires := (p_date + 1)::TIMESTAMPTZ AT TIME ZONE v_safe_tz;

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
