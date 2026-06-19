-- ============================================================
-- FIX: Atomic profile counter increment
-- Replaces the read-then-write race condition in quest completion
-- and habit creation routes.
--
-- Usage (from server-side Supabase client):
--   await supabase.rpc('increment_profile_counter', {
--     p_user_id: userId,
--     p_column: 'quests_completed'   -- or 'habits_tracked'
--   });
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_profile_counter(
  p_user_id UUID,
  p_column  TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Validates that p_column is an allowed counter column to prevent SQL injection
  IF p_column NOT IN ('quests_completed', 'habits_tracked', 'achievements_count') THEN
    RAISE EXCEPTION 'Invalid counter column: %', p_column;
  END IF;

  EXECUTE format(
    'UPDATE public.profiles SET %I = %I + 1 WHERE id = $1',
    p_column, p_column
  ) USING p_user_id;
END;
$$;
