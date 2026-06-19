-- ============================================================
-- SOLO LEVELING BACKEND — COMPLETE POSTGRESQL SCHEMA
-- Version: 1.0.0  |  Target: Supabase + PostgreSQL 15+
-- ============================================================

-- ─────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fuzzy search on usernames
CREATE EXTENSION IF NOT EXISTS "btree_gist";     -- exclusion constraints
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- gen_random_uuid()

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE rank_tier AS ENUM ('E','D','C','B','A','S','National','Monarch');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE goal_period AS ENUM ('daily','weekly','monthly','yearly','custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE goal_status AS ENUM ('active','completed','failed','paused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE quest_difficulty AS ENUM ('easy','normal','hard','elite','legendary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE achievement_rarity AS ENUM ('common','rare','epic','legendary');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('quest','achievement','streak','social','challenge','system','report');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE friend_status AS ENUM ('pending','accepted','blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE challenge_status AS ENUM ('open','active','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE report_period AS ENUM ('daily','weekly','monthly','yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- TABLE 1: PROFILES  (extends Supabase auth.users)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        TEXT UNIQUE NOT NULL,
    display_name    TEXT NOT NULL,
    avatar_url      TEXT,
    bio             TEXT,
    timezone        TEXT DEFAULT 'UTC',

    -- XP & Level
    xp              BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0),
    level           INT NOT NULL DEFAULT 1 CHECK (level >= 1),
    rank            rank_tier NOT NULL DEFAULT 'E',
    xp_to_next_level BIGINT NOT NULL DEFAULT 1000,

    -- Streaks
    current_streak  INT NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    max_streak      INT NOT NULL DEFAULT 0 CHECK (max_streak >= 0),
    last_active_date DATE,

    -- Aggregated counters (denormalised for fast reads)
    quests_completed    INT NOT NULL DEFAULT 0,
    habits_tracked      INT NOT NULL DEFAULT 0,
    achievements_count  INT NOT NULL DEFAULT 0,
    total_xp_earned     BIGINT NOT NULL DEFAULT 0,

    -- Onboarding
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    onboarding_step      INT NOT NULL DEFAULT 0,

    -- Settings
    is_public           BOOLEAN NOT NULL DEFAULT true,
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    push_notifications  BOOLEAN NOT NULL DEFAULT true,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 2: CATEGORIES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT UNIQUE NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    icon_name   TEXT NOT NULL,           -- lucide icon name
    color       TEXT NOT NULL,           -- hex color
    description TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    is_system   BOOLEAN NOT NULL DEFAULT false,   -- built-in vs user-created
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed system categories
INSERT INTO public.categories (name, slug, icon_name, color, description, sort_order, is_system) VALUES
('Fitness',      'fitness',      'Dumbbell',   '#3b82f6', 'Physical health & exercise',    1,  true),
('Learning',     'learning',     'BookOpen',   '#8b5cf6', 'Knowledge & education',         2,  true),
('Mindfulness',  'mindfulness',  'Brain',      '#ec4899', 'Mental wellbeing & meditation', 3,  true),
('Health',       'health',       'Heart',      '#10b981', 'Overall health & nutrition',    4,  true),
('Career',       'career',       'TrendingUp', '#f59e0b', 'Work & professional growth',    5,  true),
('Skills',       'skills',       'Zap',        '#06b6d4', 'Technical & creative skills',   6,  true),
('Social',       'social',       'Users',      '#f97316', 'Relationships & community',     7,  true),
('Finance',      'finance',      'Target',     '#84cc16', 'Financial goals & savings',     8,  true)
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- TABLE 3: GOALS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.goals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    period          goal_period NOT NULL DEFAULT 'custom',
    status          goal_status NOT NULL DEFAULT 'active',
    progress        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
    target_value    NUMERIC,                   -- optional quantitative target
    current_value   NUMERIC DEFAULT 0,
    unit            TEXT,                      -- e.g. "km", "pages", "hours"
    xp_reward       INT NOT NULL DEFAULT 500 CHECK (xp_reward >= 0),
    deadline        DATE,
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    completed_at    TIMESTAMPTZ,
    is_pinned       BOOLEAN NOT NULL DEFAULT false,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 4: GOAL MILESTONES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.goal_milestones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id     UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    completed   BOOLEAN NOT NULL DEFAULT false,
    sort_order  INT NOT NULL DEFAULT 0,
    xp_reward   INT NOT NULL DEFAULT 100,
    completed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 5: HABITS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.habits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    icon_name       TEXT NOT NULL DEFAULT 'Circle',
    color           TEXT NOT NULL DEFAULT '#3b82f6',
    weekly_target   INT NOT NULL DEFAULT 5 CHECK (weekly_target BETWEEN 1 AND 7),
    xp_per_completion INT NOT NULL DEFAULT 50,
    current_streak  INT NOT NULL DEFAULT 0,
    max_streak      INT NOT NULL DEFAULT 0,
    total_completions INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 6: HABIT LOGS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.habit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id    UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
    completed   BOOLEAN NOT NULL DEFAULT true,
    note        TEXT,
    xp_earned   INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (habit_id, logged_date)   -- one log per habit per day
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 7: XP TRANSACTIONS  (immutable ledger)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount      INT NOT NULL,                  -- can be negative (e.g. penalties)
    source_type TEXT NOT NULL,                 -- 'quest'|'habit'|'goal'|'achievement'|'challenge'|'bonus'
    source_id   UUID,                          -- reference to source row
    description TEXT NOT NULL,
    balance_after BIGINT NOT NULL,             -- snapshot of xp after this transaction
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 8: LEVEL CONFIG  (XP thresholds per level)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.level_config (
    level       INT PRIMARY KEY CHECK (level >= 1),
    xp_required BIGINT NOT NULL,               -- cumulative XP to reach this level
    rank        rank_tier NOT NULL,
    title       TEXT NOT NULL,                 -- e.g. "Shadow Soldier"
    xp_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0
);

-- Populate level→rank mapping (exponential curve)
-- Formula: xp_required = floor(100 * level^1.8)
INSERT INTO public.level_config (level, xp_required, rank, title) VALUES
(1,  0,      'E', 'Weakest'),
(2,  174,    'E', 'Weakest'),
(3,  393,    'E', 'Weakest'),
(4,  655,    'E', 'Weak'),
(5,  960,    'D', 'Apprentice'),
(10, 3981,   'D', 'Apprentice'),
(20, 13195,  'C', 'Adept'),
(35, 36563,  'B', 'Expert'),
(50, 83176,  'A', 'Master'),
(75, 237841, 'S', 'Legend'),
(100,500000, 'National', 'National Hero'),
(150,1500000,'Monarch', 'Shadow Monarch')
ON CONFLICT (level) DO NOTHING;
-- (All intermediate levels generated by migration seed script)

-- ═══════════════════════════════════════════════════════════════
-- TABLE 9: QUESTS  (templates — reused for generation)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.quest_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    difficulty      quest_difficulty NOT NULL DEFAULT 'normal',
    xp_reward       INT NOT NULL CHECK (xp_reward > 0),
    min_level       INT NOT NULL DEFAULT 1,
    max_level       INT,                       -- NULL = no upper bound
    is_active       BOOLEAN NOT NULL DEFAULT true,
    weight          INT NOT NULL DEFAULT 100,  -- probability weight for generation
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 10: DAILY QUESTS  (user's active quest instances)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.daily_quests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_id     UUID REFERENCES public.quest_templates(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    category_id     UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    difficulty      quest_difficulty NOT NULL DEFAULT 'normal',
    xp_reward       INT NOT NULL,
    completed       BOOLEAN NOT NULL DEFAULT false,
    completed_at    TIMESTAMPTZ,
    quest_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_at      TIMESTAMPTZ NOT NULL,      -- midnight of quest_date in user's timezone
    is_bonus        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, template_id, quest_date)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 11: ACHIEVEMENTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    icon_name       TEXT NOT NULL,
    rarity          achievement_rarity NOT NULL DEFAULT 'common',
    xp_bonus        INT NOT NULL DEFAULT 0,
    badge_url       TEXT,
    trigger_type    TEXT NOT NULL,             -- 'quest_count'|'streak'|'level'|'habit'|'custom'
    trigger_value   JSONB NOT NULL DEFAULT '{}', -- {"count": 100} etc.
    is_secret       BOOLEAN NOT NULL DEFAULT false,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 12: USER ACHIEVEMENTS  (unlock records)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id  UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    xp_awarded      INT NOT NULL DEFAULT 0,
    UNIQUE (user_id, achievement_id)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 13: ANALYTICS SCORES  (daily snapshot)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.analytics_scores (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score_date          DATE NOT NULL DEFAULT CURRENT_DATE,

    -- The 7 domain scores (0–100)
    life_score          NUMERIC(5,2) NOT NULL DEFAULT 0,
    discipline_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
    growth_score        NUMERIC(5,2) NOT NULL DEFAULT 0,
    health_score        NUMERIC(5,2) NOT NULL DEFAULT 0,
    learning_score      NUMERIC(5,2) NOT NULL DEFAULT 0,
    productivity_score  NUMERIC(5,2) NOT NULL DEFAULT 0,
    relationship_score  NUMERIC(5,2) NOT NULL DEFAULT 0,

    -- Raw inputs for recalculation
    quests_done         INT NOT NULL DEFAULT 0,
    quests_total        INT NOT NULL DEFAULT 0,
    habits_done         INT NOT NULL DEFAULT 0,
    habits_total        INT NOT NULL DEFAULT 0,
    streak_days         INT NOT NULL DEFAULT 0,
    xp_earned_today     INT NOT NULL DEFAULT 0,

    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, score_date)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 14: REPORTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period          report_period NOT NULL,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    data            JSONB NOT NULL DEFAULT '{}',  -- full report payload
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, period, period_start)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 15: FRIENDSHIPS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.friendships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status          friend_status NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 16: GROUPS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.groups (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    avatar_url      TEXT,
    is_public       BOOLEAN NOT NULL DEFAULT true,
    max_members     INT NOT NULL DEFAULT 50,
    member_count    INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 17: GROUP MEMBERS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.group_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'member',  -- 'owner'|'admin'|'member'
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 18: CHALLENGES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.challenges (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id        UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    difficulty      quest_difficulty NOT NULL DEFAULT 'normal',
    xp_reward       INT NOT NULL DEFAULT 1000,
    status          challenge_status NOT NULL DEFAULT 'open',
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    max_participants INT,
    participant_count INT NOT NULL DEFAULT 0,
    goal_type       TEXT NOT NULL,             -- 'habit_streak'|'quest_count'|'xp_target'|'custom'
    goal_target     JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date > start_date)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 19: CHALLENGE PARTICIPANTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.challenge_participants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id    UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    progress        NUMERIC(5,2) NOT NULL DEFAULT 0,
    completed       BOOLEAN NOT NULL DEFAULT false,
    completed_at    TIMESTAMPTZ,
    rank_position   INT,
    xp_earned       INT NOT NULL DEFAULT 0,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (challenge_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 20: LEADERBOARD SNAPSHOTS  (cached, rebuilt daily)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period          report_period NOT NULL,    -- 'weekly'|'monthly'|'yearly'|'daily'
    period_start    DATE NOT NULL,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rank_position   INT NOT NULL,
    xp_earned       BIGINT NOT NULL DEFAULT 0,
    level           INT NOT NULL,
    rank_tier       rank_tier NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (period, period_start, user_id)
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 21: NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type        notification_type NOT NULL,
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    data        JSONB DEFAULT '{}',            -- extra context (source_id, etc.)
    read        BOOLEAN NOT NULL DEFAULT false,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 22: AI INSIGHTS  (generated per user, cached)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,                 -- 'insight'|'suggestion'|'warning'
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    action      TEXT,
    dismissed   BOOLEAN NOT NULL DEFAULT false,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TABLE 23: COMMUNITY ACTIVITY FEED
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.activity_feed (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action      TEXT NOT NULL,                 -- 'completed'|'achieved'|'leveled_up'|'started'
    target      TEXT NOT NULL,                 -- human-readable target string
    source_type TEXT NOT NULL,
    source_id   UUID,
    xp_earned   INT NOT NULL DEFAULT 0,
    is_public   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES — optimised for the most frequent query patterns
-- ═══════════════════════════════════════════════════════════════

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username        ON public.profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_rank_level      ON public.profiles (rank, level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_xp_desc        ON public.profiles (xp DESC);

-- Goals
CREATE INDEX IF NOT EXISTS idx_goals_user_status        ON public.goals (user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_user_period        ON public.goals (user_id, period);
CREATE INDEX IF NOT EXISTS idx_goals_deadline           ON public.goals (deadline) WHERE status = 'active';

-- Habits
CREATE INDEX IF NOT EXISTS idx_habits_user_active       ON public.habits (user_id) WHERE is_active = true;

-- Habit Logs
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date     ON public.habit_logs (user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date    ON public.habit_logs (habit_id, logged_date DESC);

-- XP Transactions
CREATE INDEX IF NOT EXISTS idx_xp_tx_user_created       ON public.xp_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_tx_source             ON public.xp_transactions (source_type, source_id);

-- Daily Quests
CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date   ON public.daily_quests (user_id, quest_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_quests_expiry      ON public.daily_quests (expires_at) WHERE completed = false;

-- Achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user   ON public.user_achievements (user_id, unlocked_at DESC);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_user_date      ON public.analytics_scores (user_id, score_date DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id, created_at DESC) WHERE read = false;

-- Friendships
CREATE INDEX IF NOT EXISTS idx_friendships_addressee    ON public.friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_requester    ON public.friendships (requester_id, status);

-- Activity Feed
CREATE INDEX IF NOT EXISTS idx_feed_user_created        ON public.activity_feed (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_public_created      ON public.activity_feed (created_at DESC) WHERE is_public = true;

-- Leaderboard
CREATE INDEX IF NOT EXISTS idx_leaderboard_period_rank  ON public.leaderboard_snapshots (period, period_start, rank_position);

-- ═══════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER (reusable)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at       BEFORE UPDATE ON public.profiles       FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS trg_goals_updated_at ON public.goals;
CREATE TRIGGER trg_goals_updated_at          BEFORE UPDATE ON public.goals          FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS trg_habits_updated_at ON public.habits;
CREATE TRIGGER trg_habits_updated_at         BEFORE UPDATE ON public.habits         FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS trg_challenges_updated_at ON public.challenges;
CREATE TRIGGER trg_challenges_updated_at     BEFORE UPDATE ON public.challenges     FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS trg_groups_updated_at ON public.groups;
CREATE TRIGGER trg_groups_updated_at         BEFORE UPDATE ON public.groups         FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS trg_friendships_updated_at ON public.friendships;
CREATE TRIGGER trg_friendships_updated_at    BEFORE UPDATE ON public.friendships    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _username TEXT;
BEGIN
  -- derive username from email, ensure uniqueness
  _username := LOWER(SPLIT_PART(NEW.email, '@', 1));
  _username := REGEXP_REPLACE(_username, '[^a-z0-9_]', '_', 'g');
  -- append random suffix if taken
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = _username) LOOP
    _username := _username || '_' || FLOOR(RANDOM() * 9000 + 1000)::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    _username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', _username),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
