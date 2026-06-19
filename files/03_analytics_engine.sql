-- ============================================================
-- SOLO LEVELING — ANALYTICS ENGINE
-- Exact score formulas + PostgreSQL functions
-- ============================================================

/*
════════════════════════════════════════════════════════════════
  SCORE DEFINITIONS  (all scores: 0–100, higher = better)
════════════════════════════════════════════════════════════════

All 7 scores feed into LIFE SCORE as a weighted composite.

Variables used across formulas:
  Q_done       = quests completed today
  Q_total      = total quests assigned today
  H_done       = habits completed today
  H_total      = habits user has active
  streak       = current streak (days)
  xp_today     = XP earned today
  xp_7d_avg    = average daily XP over last 7 days
  hr_fitness   = completion rate of Fitness-category habits (0–1)
  hr_learning  = completion rate of Learning-category habits (0–1)
  hr_social    = completion rate of Social-category habits (0–1)
  goal_prog    = avg progress of active goals (0–100)
  challenge_p  = fraction of challenges completed this month (0–1)
  friend_int   = friend interactions this week (capped at 10)

══════════════════════════════════════════════════════════════
1. DISCIPLINE SCORE
   Definition: Consistency of showing up regardless of difficulty.
   Formula:
     quest_rate  = (Q_done / MAX(Q_total, 1)) * 100
     habit_rate  = (H_done / MAX(H_total, 1)) * 100
     streak_bonus = MIN(streak / 30, 1) * 20          -- up to +20 for 30-day streak
     raw = (quest_rate * 0.4) + (habit_rate * 0.4) + streak_bonus
     DISCIPLINE = LEAST(ROUND(raw), 100)
══════════════════════════════════════════════════════════════
2. PRODUCTIVITY SCORE
   Definition: Output quality and quantity of completed work.
   Formula:
     quest_rate  = (Q_done / MAX(Q_total, 1)) * 100
     xp_rate     = LEAST((xp_today / MAX(xp_7d_avg, 50)) * 100, 150)
     goal_bonus  = (goal_prog / 100) * 20
     raw = (quest_rate * 0.5) + (xp_rate * 0.3) + goal_bonus
     PRODUCTIVITY = LEAST(ROUND(raw), 100)
══════════════════════════════════════════════════════════════
3. HEALTH SCORE
   Definition: Physical and mental wellness habits.
   Formula:
     fitness_habits = hr_fitness * 70
     mindful_habits = hr_mindfulness * 30
     HEALTH = LEAST(ROUND(fitness_habits + mindful_habits), 100)
══════════════════════════════════════════════════════════════
4. LEARNING SCORE
   Definition: Intellectual growth and knowledge acquisition.
   Formula:
     habit_contrib  = hr_learning * 60
     quest_contrib  = (learning_quests_done / MAX(learning_quests_total, 1)) * 40
     LEARNING = LEAST(ROUND(habit_contrib + quest_contrib), 100)
══════════════════════════════════════════════════════════════
5. GROWTH SCORE
   Definition: Long-term progression across levels, ranks, goals.
   Formula:
     level_factor   = LEAST(level / 100.0, 1.0) * 40
     goal_factor    = (goal_prog / 100) * 40
     achievement_f  = LEAST(achievements_unlocked / 50.0, 1.0) * 20
     GROWTH = LEAST(ROUND(level_factor + goal_factor + achievement_f), 100)
══════════════════════════════════════════════════════════════
6. RELATIONSHIP SCORE
   Definition: Community engagement and social connections.
   Formula:
     friend_score     = LEAST(friend_count / 10.0, 1.0) * 40
     interaction_score = LEAST(friend_int / 10.0, 1.0) * 40
     challenge_score  = challenge_p * 20
     RELATIONSHIP = LEAST(ROUND(friend_score + interaction_score + challenge_score), 100)
══════════════════════════════════════════════════════════════
7. LIFE SCORE  (the master score)
   Definition: Holistic quality-of-life index.
   Weights:
     Discipline    25%
     Productivity  20%
     Health        20%
     Learning      15%
     Growth        10%
     Relationship  10%
   Formula:
     LIFE_SCORE = ROUND(
       DISCIPLINE   * 0.25 +
       PRODUCTIVITY * 0.20 +
       HEALTH       * 0.20 +
       LEARNING     * 0.15 +
       GROWTH       * 0.10 +
       RELATIONSHIP * 0.10
     )
════════════════════════════════════════════════════════════════
*/

-- ─────────────────────────────────────────
-- FUNCTION: compute all 7 scores for a user on a given date
-- ─────────────────────────────────────────
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
  -- NOTE: Postgres has no built-in cast from boolean to integer
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

-- ─────────────────────────────────────────
-- FUNCTION: upsert daily analytics snapshot
-- Called by: cron job at 23:55 user local time
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_analytics_snapshot(
  p_user_id UUID,
  p_date    DATE DEFAULT CURRENT_DATE
)
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

  SELECT COALESCE(SUM(amount), 0) INTO v_xp_today
  FROM public.xp_transactions
  WHERE user_id = p_user_id AND DATE(created_at) = p_date AND amount > 0;

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

-- ─────────────────────────────────────────
-- FUNCTION: award XP + level-up check
-- ─────────────────────────────────────────
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

-- ─────────────────────────────────────────
-- FUNCTION: recalculate streak for a user
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalculate_streak(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_streak INT := 0;
  v_check_date DATE := CURRENT_DATE;
  v_had_activity BOOLEAN;
BEGIN
  LOOP
    -- A day counts if user completed ≥1 quest OR ≥1 habit
    SELECT EXISTS (
      SELECT 1 FROM public.daily_quests
      WHERE user_id = p_user_id AND quest_date = v_check_date AND completed = true
      UNION ALL
      SELECT 1 FROM public.habit_logs
      WHERE user_id = p_user_id AND logged_date = v_check_date AND completed = true
    ) INTO v_had_activity;

    EXIT WHEN NOT v_had_activity;
    v_streak := v_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
    EXIT WHEN v_streak > 3650; -- safety cap
  END LOOP;

  UPDATE public.profiles SET
    current_streak = v_streak,
    max_streak = GREATEST(max_streak, v_streak),
    last_active_date = CURRENT_DATE
  WHERE id = p_user_id;

  RETURN v_streak;
END;
$$;

-- ─────────────────────────────────────────
-- FUNCTION: generate daily quests for a user
-- ─────────────────────────────────────────
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
    -- Exclude already assigned today
    AND qt.id NOT IN (
      SELECT template_id FROM public.daily_quests
      WHERE user_id = p_user_id AND quest_date = p_date
    )
  ORDER BY RANDOM() * qt.weight DESC
  LIMIT p_count
  ON CONFLICT (user_id, template_id, quest_date) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;
