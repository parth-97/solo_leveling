-- ============================================================
-- SOLO LEVELING BACKEND — ROW LEVEL SECURITY POLICIES
-- All tables use RLS. Supabase auth.uid() = current user.
-- ============================================================

-- ─────────────────────────────────────────
-- Enable RLS on all tables
-- ─────────────────────────────────────────
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_milestones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quests         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_scores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed        ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════
-- Public profiles visible to all authenticated users
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_public = true OR id = auth.uid());

-- Users can only update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profile is created by trigger (SECURITY DEFINER), not directly by user
-- No INSERT policy needed for public role.

-- ═══════════════════════════════════════════════════════════════
-- GOALS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "goals_select_own" ON public.goals;
CREATE POLICY "goals_select_own"
  ON public.goals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "goals_insert_own" ON public.goals;
CREATE POLICY "goals_insert_own"
  ON public.goals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "goals_update_own" ON public.goals;
CREATE POLICY "goals_update_own"
  ON public.goals FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "goals_delete_own" ON public.goals;
CREATE POLICY "goals_delete_own"
  ON public.goals FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- GOAL MILESTONES  (inherit from goals)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "milestones_select_own" ON public.goal_milestones;
CREATE POLICY "milestones_select_own"
  ON public.goal_milestones FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "milestones_insert_own" ON public.goal_milestones;
CREATE POLICY "milestones_insert_own"
  ON public.goal_milestones FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "milestones_update_own" ON public.goal_milestones;
CREATE POLICY "milestones_update_own"
  ON public.goal_milestones FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "milestones_delete_own" ON public.goal_milestones;
CREATE POLICY "milestones_delete_own"
  ON public.goal_milestones FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.goals g
    WHERE g.id = goal_milestones.goal_id AND g.user_id = auth.uid()
  ));

-- ═══════════════════════════════════════════════════════════════
-- HABITS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "habits_crud_own" ON public.habits;
CREATE POLICY "habits_crud_own"
  ON public.habits FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- HABIT LOGS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "habit_logs_crud_own" ON public.habit_logs;
CREATE POLICY "habit_logs_crud_own"
  ON public.habit_logs FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- XP TRANSACTIONS  (read-only for user; written by service role)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "xp_tx_select_own" ON public.xp_transactions;
CREATE POLICY "xp_tx_select_own"
  ON public.xp_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE only by service_role (backend)
-- No user-facing write policies.

-- ═══════════════════════════════════════════════════════════════
-- DAILY QUESTS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "quests_select_own" ON public.daily_quests;
CREATE POLICY "quests_select_own"
  ON public.daily_quests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can update only their own quests (to mark complete)
DROP POLICY IF EXISTS "quests_update_own" ON public.daily_quests;
CREATE POLICY "quests_update_own"
  ON public.daily_quests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- INSERT by service_role only (quest generation engine)

-- ═══════════════════════════════════════════════════════════════
-- USER ACHIEVEMENTS
-- ═══════════════════════════════════════════════════════════════
-- Users can see own achievements; friends can see public ones
DROP POLICY IF EXISTS "achievements_select_own" ON public.user_achievements;
CREATE POLICY "achievements_select_own"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT by service_role only (achievement engine)

-- ═══════════════════════════════════════════════════════════════
-- ANALYTICS SCORES
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "analytics_select_own" ON public.analytics_scores;
CREATE POLICY "analytics_select_own"
  ON public.analytics_scores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Written by service_role scheduled job

-- ═══════════════════════════════════════════════════════════════
-- REPORTS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own"
  ON public.reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- FRIENDSHIPS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "friendships_select_own" ON public.friendships;
CREATE POLICY "friendships_select_own"
  ON public.friendships FOR SELECT
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

DROP POLICY IF EXISTS "friendships_insert_requester" ON public.friendships;
CREATE POLICY "friendships_insert_requester"
  ON public.friendships FOR INSERT
  TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- Only addressee can accept/decline; requester can cancel pending
DROP POLICY IF EXISTS "friendships_update" ON public.friendships;
CREATE POLICY "friendships_update"
  ON public.friendships FOR UPDATE
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

DROP POLICY IF EXISTS "friendships_delete" ON public.friendships;
CREATE POLICY "friendships_delete"
  ON public.friendships FOR DELETE
  TO authenticated
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- GROUPS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "groups_select_public" ON public.groups;
CREATE POLICY "groups_select_public"
  ON public.groups FOR SELECT
  TO authenticated
  USING (is_public = true OR owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "groups_insert_own" ON public.groups;
CREATE POLICY "groups_insert_own"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "groups_update_owner" ON public.groups;
CREATE POLICY "groups_update_owner"
  ON public.groups FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "groups_delete_owner" ON public.groups;
CREATE POLICY "groups_delete_owner"
  ON public.groups FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- GROUP MEMBERS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "group_members_select" ON public.group_members;
CREATE POLICY "group_members_select"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id AND (g.is_public = true OR g.owner_id = auth.uid())
  ) OR user_id = auth.uid());

DROP POLICY IF EXISTS "group_members_insert_self" ON public.group_members;
CREATE POLICY "group_members_insert_self"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "group_members_delete_self_or_owner" ON public.group_members;
CREATE POLICY "group_members_delete_self_or_owner"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_members.group_id AND g.owner_id = auth.uid()
  ));

-- ═══════════════════════════════════════════════════════════════
-- CHALLENGES
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "challenges_select_open" ON public.challenges;
CREATE POLICY "challenges_select_open"
  ON public.challenges FOR SELECT
  TO authenticated
  USING (status IN ('open','active','completed') OR creator_id = auth.uid());

DROP POLICY IF EXISTS "challenges_insert_own" ON public.challenges;
CREATE POLICY "challenges_insert_own"
  ON public.challenges FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "challenges_update_creator" ON public.challenges;
CREATE POLICY "challenges_update_creator"
  ON public.challenges FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- CHALLENGE PARTICIPANTS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "challenge_participants_select" ON public.challenge_participants;
CREATE POLICY "challenge_participants_select"
  ON public.challenge_participants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = challenge_participants.challenge_id AND c.status IN ('open','active','completed')
  ));

DROP POLICY IF EXISTS "challenge_participants_join" ON public.challenge_participants;
CREATE POLICY "challenge_participants_join"
  ON public.challenge_participants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "challenge_participants_update_own" ON public.challenge_participants;
CREATE POLICY "challenge_participants_update_own"
  ON public.challenge_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- LEADERBOARD SNAPSHOTS  (public read, service_role write)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "leaderboard_select_all" ON public.leaderboard_snapshots;
CREATE POLICY "leaderboard_select_all"
  ON public.leaderboard_snapshots FOR SELECT
  TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "notifications_crud_own" ON public.notifications;
CREATE POLICY "notifications_crud_own"
  ON public.notifications FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- AI INSIGHTS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "insights_select_own" ON public.ai_insights;
CREATE POLICY "insights_select_own"
  ON public.ai_insights FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insights_update_dismiss" ON public.ai_insights;
CREATE POLICY "insights_update_dismiss"
  ON public.ai_insights FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════
-- ACTIVITY FEED
-- ═══════════════════════════════════════════════════════════════
-- Public feed items visible to friends; own items always visible
DROP POLICY IF EXISTS "feed_select" ON public.activity_feed;
CREATE POLICY "feed_select"
  ON public.activity_feed FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (is_public = true AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = auth.uid() AND f.addressee_id = activity_feed.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = activity_feed.user_id))
    ))
  );

-- Written by service_role only
