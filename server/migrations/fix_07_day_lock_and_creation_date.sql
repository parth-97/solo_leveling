-- ============================================================
-- FIX 07: Day Lock System, Creation Date Tracking, Unique Constraints,
--         Indexes, Goal Penalty Tracking, XP Idempotency
-- ============================================================
-- Run this migration in Supabase SQL editor (or via migration tooling).
-- All statements are idempotent — safe to re-run.

-- ──────────────────────────────────────────────────────────────
-- 1. ADD MISSING COLUMNS TO habit_logs
-- ──────────────────────────────────────────────────────────────

-- Track when a log was last updated
ALTER TABLE public.habit_logs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS penalty_applied BOOLEAN NOT NULL DEFAULT FALSE;

-- Track when a completed log was actually completed
-- (populated by trigger on insert when completed=true)

-- ──────────────────────────────────────────────────────────────
-- 2. UNIQUE CONSTRAINT — one log per (user, habit, date)
-- ──────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'habit_logs_habit_user_date_unique'
  ) THEN
    ALTER TABLE public.habit_logs
      ADD CONSTRAINT habit_logs_habit_user_date_unique
      UNIQUE (habit_id, user_id, logged_date);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
-- 3. ADD habits.created_at INDEX (already exists usually, but ensure)
-- ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date
  ON public.habit_logs (habit_id, logged_date DESC);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date
  ON public.habit_logs (user_id, logged_date DESC);

CREATE INDEX IF NOT EXISTS idx_habit_logs_locked
  ON public.habit_logs (is_locked, logged_date);

CREATE INDEX IF NOT EXISTS idx_habits_user_active
  ON public.habits (user_id, is_active, created_at);

CREATE INDEX IF NOT EXISTS idx_goals_deadline_status
  ON public.goals (user_id, status, deadline)
  WHERE status = 'active' AND deadline IS NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- 4. ADD GOAL PENALTY TRACKING COLUMNS
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS penalty_applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS penalty_amount INT NOT NULL DEFAULT 0;

-- ──────────────────────────────────────────────────────────────
-- 5. TRIGGER: auto-set completed_at on habit_logs
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_habit_log_completed_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.completed = TRUE AND NEW.completed_at IS NULL THEN
    NEW.completed_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_habit_log_timestamps ON public.habit_logs;
CREATE TRIGGER trg_habit_log_timestamps
  BEFORE INSERT OR UPDATE ON public.habit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_habit_log_completed_at();

-- ──────────────────────────────────────────────────────────────
-- 6. FUNCTION: lock_day — locks all habit_logs for a given date
--    Called by midnight rollover cron job
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lock_day_for_user(
  p_user_id UUID,
  p_date    DATE
)
RETURNS INT  -- number of rows locked
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_locked INT;
BEGIN
  UPDATE public.habit_logs
  SET
    is_locked  = TRUE,
    locked_at  = NOW(),
    updated_at = NOW()
  WHERE
    user_id    = p_user_id
    AND logged_date = p_date
    AND is_locked   = FALSE;

  GET DIAGNOSTICS v_locked = ROW_COUNT;
  RETURN v_locked;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 7. FUNCTION: process_missed_habits — inserts missed logs for
--    habits that had no log on a given date, applies XP penalty
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_missed_habits_for_user(
  p_user_id UUID,
  p_date    DATE
)
RETURNS INT  -- number of habits penalized
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_habit       RECORD;
  v_penalty     INT;
  v_penalized   INT := 0;
  v_habit_creation DATE;
BEGIN
  -- For each active habit where there's no log for p_date AND
  -- p_date >= the habit's created_at date
  FOR v_habit IN
    SELECT h.id, h.xp_per_completion, h.name, h.created_at::DATE AS habit_created
    FROM public.habits h
    WHERE h.user_id = p_user_id
      AND h.is_active = TRUE
      AND h.created_at::DATE <= p_date      -- habit existed on that day
      AND NOT EXISTS (
        SELECT 1 FROM public.habit_logs hl
        WHERE hl.habit_id = h.id
          AND hl.logged_date = p_date
      )
  LOOP
    -- XP penalty = 100% of xp_per_completion (full penalty at rollover)
    v_penalty := GREATEST(1, v_habit.xp_per_completion);

    -- Insert a missed log (completed=false, locked=true since it's past)
    INSERT INTO public.habit_logs (
      habit_id, user_id, logged_date, completed,
      xp_earned, penalty_applied, is_locked, locked_at
    ) VALUES (
      v_habit.id, p_user_id, p_date, FALSE,
      -v_penalty, TRUE, TRUE, NOW()
    )
    ON CONFLICT (habit_id, user_id, logged_date) DO NOTHING;

    -- Only deduct XP if insert actually happened (no conflict)
    IF FOUND THEN
      PERFORM public.award_xp(
        p_user_id,
        -v_penalty,
        'habit',
        v_habit.id,
        'Habit missed: ' || v_habit.name
      );
      v_penalized := v_penalized + 1;
    END IF;
  END LOOP;

  RETURN v_penalized;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 8. FUNCTION: process_overdue_goals — applies 2× penalty to goals
--    whose deadline has passed and are still active
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_overdue_goals()
RETURNS INT  -- number of goals penalized
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_goal      RECORD;
  v_penalty   INT;
  v_penalized INT := 0;
BEGIN
  FOR v_goal IN
    SELECT id, user_id, title, xp_reward, deadline
    FROM public.goals
    WHERE status = 'active'
      AND deadline IS NOT NULL
      AND deadline::DATE < CURRENT_DATE
      AND penalty_applied_at IS NULL  -- only once
  LOOP
    -- Penalty = 2× the reward
    v_penalty := v_goal.xp_reward * 2;

    -- Mark goal as failed and record penalty
    UPDATE public.goals
    SET
      status              = 'failed',
      penalty_applied_at  = NOW(),
      penalty_amount      = v_penalty,
      updated_at          = NOW()
    WHERE id = v_goal.id;

    -- Deduct XP
    PERFORM public.award_xp(
      v_goal.user_id,
      -v_penalty,
      'goal',
      v_goal.id,
      'Goal deadline missed: ' || v_goal.title
    );

    v_penalized := v_penalized + 1;
  END LOOP;

  RETURN v_penalized;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 9. TABLE: midnight_rollover_log — idempotency guard so rollover
--    runs exactly once per date per user
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.midnight_rollover_log (
  user_id     UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  process_date DATE   NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  habits_locked   INT NOT NULL DEFAULT 0,
  habits_missed   INT NOT NULL DEFAULT 0,
  goals_penalized INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, process_date)
);

CREATE INDEX IF NOT EXISTS idx_rollover_log_date
  ON public.midnight_rollover_log (process_date);

-- RLS: users can only see their own rollover logs
ALTER TABLE public.midnight_rollover_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rollover_log_select_own ON public.midnight_rollover_log;
CREATE POLICY rollover_log_select_own ON public.midnight_rollover_log
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS rollover_log_insert_service ON public.midnight_rollover_log;
CREATE POLICY rollover_log_insert_service ON public.midnight_rollover_log
  FOR INSERT WITH CHECK (TRUE);  -- service role only via SECURITY DEFINER functions

-- ──────────────────────────────────────────────────────────────
-- 10. FUNCTION: midnight_rollover_for_user — master rollover function
--     Idempotent via midnight_rollover_log PK constraint
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.midnight_rollover_for_user(
  p_user_id    UUID,
  p_yesterday  DATE DEFAULT (CURRENT_DATE - 1)
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_locked    INT := 0;
  v_missed    INT := 0;
  v_goals     INT := 0;
BEGIN
  -- Idempotency: if already processed today for yesterday, skip
  IF EXISTS (
    SELECT 1 FROM public.midnight_rollover_log
    WHERE user_id = p_user_id AND process_date = p_yesterday
  ) THEN
    RETURN jsonb_build_object('skipped', true, 'date', p_yesterday);
  END IF;

  -- 1. Lock previous day's logs
  v_locked := public.lock_day_for_user(p_user_id, p_yesterday);

  -- 2. Insert missed habit logs + deduct XP
  v_missed := public.process_missed_habits_for_user(p_user_id, p_yesterday);

  -- 3. Recalculate streaks for all active habits
  PERFORM public.recalculate_streak(p_user_id);

  -- 4. Record completion
  INSERT INTO public.midnight_rollover_log (
    user_id, process_date, processed_at,
    habits_locked, habits_missed, goals_penalized
  ) VALUES (
    p_user_id, p_yesterday, NOW(),
    v_locked, v_missed, 0
  ) ON CONFLICT (user_id, process_date) DO NOTHING;

  RETURN jsonb_build_object(
    'skipped',          false,
    'date',             p_yesterday,
    'habitsLocked',     v_locked,
    'habitsMissed',     v_missed,
    'goalsPenalized',   v_goals
  );
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 11. Add is_locked check in RLS or backend — we enforce via API
--     but also add a helpful view for debugging
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_habit_log_status AS
SELECT
  hl.*,
  h.name        AS habit_name,
  h.created_at  AS habit_created_at,
  CASE
    WHEN hl.is_locked             THEN 'locked'
    WHEN hl.completed = TRUE      THEN 'completed'
    WHEN hl.completed = FALSE     THEN 'missed'
    ELSE 'unknown'
  END AS display_status
FROM public.habit_logs hl
JOIN public.habits h ON h.id = hl.habit_id;
