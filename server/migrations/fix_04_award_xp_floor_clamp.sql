-- ============================================================
-- FIX: award_xp could push profiles.xp negative when a large
-- deduction (e.g. deleting a habit that earned more XP than the
-- user currently has, after other XP was later spent/removed)
-- is applied. Clamp the floor at 0.
--
-- Needed for the new "delete habit" feature, which deducts that
-- habit's total earned XP via award_xp(..., -totalXp, ...).
--
-- Safe to re-run (CREATE OR REPLACE).
-- ============================================================

CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id     UUID,
  p_amount      INT,
  p_source_type TEXT,
  p_source_id   UUID,
  p_description TEXT
)
RETURNS TABLE (new_xp BIGINT, new_level INT, leveled_up BOOLEAN, new_rank rank_tier)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_xp  BIGINT;
  v_current_lvl INT;
  v_current_rank rank_tier;
  v_new_xp      BIGINT;
  v_new_level   INT;
  v_new_rank    rank_tier;
  v_leveled_up  BOOLEAN := false;
BEGIN
  SELECT xp, level, rank
  INTO v_current_xp, v_current_lvl, v_current_rank
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  v_new_xp := GREATEST(v_current_xp + p_amount, 0);

  -- Find new level from config table (highest level where cumulative xp is met)
  SELECT lc.level, lc.rank
  INTO v_new_level, v_new_rank
  FROM public.level_config lc
  WHERE lc.xp_required <= v_new_xp
  ORDER BY lc.level DESC
  LIMIT 1;

  v_new_level := COALESCE(v_new_level, 1);
  v_new_rank  := COALESCE(v_new_rank, 'E');
  v_leveled_up := v_new_level > v_current_lvl;

  -- Update profile
  UPDATE public.profiles SET
    xp = v_new_xp,
    total_xp_earned = total_xp_earned + GREATEST(p_amount, 0),
    level = v_new_level,
    rank = v_new_rank,
    xp_to_next_level = COALESCE(
      (SELECT lc2.xp_required FROM public.level_config lc2
       WHERE lc2.level = v_new_level + 1),
      999999999
    ) - v_new_xp
  WHERE id = p_user_id;

  -- Immutable ledger entry
  INSERT INTO public.xp_transactions
    (user_id, amount, source_type, source_id, description, balance_after)
  VALUES
    (p_user_id, p_amount, p_source_type, p_source_id, p_description, v_new_xp);

  -- Level-up activity feed
  IF v_leveled_up THEN
    INSERT INTO public.activity_feed (user_id, action, target, source_type, xp_earned)
    VALUES (p_user_id, 'leveled up', 'Level ' || v_new_level || ' - ' || v_new_rank::TEXT, 'system', 0);
  END IF;

  RETURN QUERY SELECT v_new_xp, v_new_level, v_leveled_up, v_new_rank;
END;
$$;

NOTIFY pgrst, 'reload schema';
