// ============================================================
// SOLO LEVELING — API CONTRACTS
// Every endpoint: method, path, request shape, response type.
//
// Import these on both sides:
//   Backend:  validates against Zod schemas derived from these
//   Frontend: passes as generic to your fetch/axios wrapper
// ============================================================

import type {
  Profile,
  UpdateProfileInput,
  Category,
  Goal,
  CreateGoalInput,
  UpdateGoalInput,
  UpdateGoalProgressInput,
  GoalMilestone,
  Habit,
  CreateHabitInput,
  UpdateHabitInput,
  LogHabitInput,
  HabitLog,
  HabitStats,
  DailyQuest,
  CompleteQuestResult,
  XpTransaction,
  XpSummary,
  LevelConfig,
  Achievement,
  UserAchievement,
  AnalyticsScores,
  AnalyticsTrend,
  RadarChartData,
  ReportData,
  ReportPeriod,
  Friendship,
  FriendProfile,
  Group,
  GroupMember,
  CreateGroupInput,
  Challenge,
  ChallengeParticipant,
  CreateChallengeInput,
  UpdateChallengeProgressInput,
  LeaderboardEntry,
  ActivityFeedItem,
  Notification,
  UnreadCountResponse,
  AiInsight,
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  GoalPeriod,
  GoalStatus,
  RankTier,
} from './shared'

// ─────────────────────────────────────────────────────────────
// AUTH  (Supabase handles the actual flows; these are our wrappers)
// ─────────────────────────────────────────────────────────────

/** POST /api/v1/auth/callback */
export type AuthCallbackRequest  = { code: string; next?: string }
export type AuthCallbackResponse = ApiResponse<{ redirectTo: string }>

/** POST /api/v1/auth/refresh */
export type AuthRefreshRequest  = { refreshToken: string }
export type AuthRefreshResponse = ApiResponse<{ accessToken: string; expiresAt: number }>

/** POST /api/v1/auth/signout — no body, no meaningful response body */
export type AuthSignoutResponse = ApiResponse<{ ok: true }>

// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/profile/me */
export type GetMyProfileResponse = ApiResponse<Profile>

/** PATCH /api/v1/profile/me */
export type UpdateMyProfileRequest  = UpdateProfileInput
export type UpdateMyProfileResponse = ApiResponse<Profile>

/** GET /api/v1/profile/:username */
export type GetPublicProfileResponse = ApiResponse<
  Omit<Profile, 'email' | 'emailNotifications' | 'pushNotifications' | 'onboardingStep'>
>

/** GET /api/v1/profile/me/stats */
export interface ProfileStats {
  totalXpEarned:    number
  questsCompleted:  number
  habitsTracked:    number
  achievementsCount: number
  maxStreak:        number
  currentStreak:    number
  totalGoalsCompleted: number
}
export type GetMyStatsResponse = ApiResponse<ProfileStats>

/** POST /api/v1/profile/me/avatar — multipart/form-data */
export type UploadAvatarResponse = ApiResponse<{ avatarUrl: string }>

/** POST /api/v1/onboarding/complete */
export interface CompleteOnboardingInput {
  displayName: string
  timezone:    string
  categoryIds: string[]    // interests chosen during onboarding
  avatarUrl?:  string      // optional preset avatar URL from onboarding step
}
export type CompleteOnboardingResponse = ApiResponse<Profile>

// ─────────────────────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/goals?period=&status=&page=&limit= */
export interface ListGoalsParams extends PaginationParams {
  period?: GoalPeriod
  status?: GoalStatus
}
export type ListGoalsResponse = PaginatedResponse<Goal>

/** POST /api/v1/goals */
export type CreateGoalRequest  = CreateGoalInput
export type CreateGoalResponse = ApiResponse<Goal>

/** GET /api/v1/goals/:id */
export type GetGoalResponse = ApiResponse<Goal>

/** PATCH /api/v1/goals/:id */
export type UpdateGoalRequest  = UpdateGoalInput
export type UpdateGoalResponse = ApiResponse<Goal>

/** DELETE /api/v1/goals/:id */
export type DeleteGoalResponse = ApiResponse<{ id: string }>

/** PATCH /api/v1/goals/:id/progress */
export type UpdateGoalProgressRequest  = UpdateGoalProgressInput
export type UpdateGoalProgressResponse = ApiResponse<{
  goal: Goal
  xpAwarded: number
  leveledUp: boolean
}>

/** POST /api/v1/goals/:id/complete */
export type CompleteGoalResponse = ApiResponse<{
  goal: Goal
  xpAwarded: number
  leveledUp: boolean
  achievementsUnlocked: Achievement[]
}>

/** POST /api/v1/goals/:id/milestones */
export interface CreateMilestoneInput { title: string; xpReward?: number }
export type CreateMilestoneResponse = ApiResponse<GoalMilestone>

/** PATCH /api/v1/goals/:id/milestones/:mid */
export type CompleteMilestoneResponse = ApiResponse<{
  milestone: GoalMilestone
  xpAwarded: number
}>

// ─────────────────────────────────────────────────────────────
// HABITS
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/habits */
export type ListHabitsResponse = ApiResponse<Habit[]>

/** POST /api/v1/habits */
export type CreateHabitRequest  = CreateHabitInput
export type CreateHabitResponse = ApiResponse<Habit>

/** GET /api/v1/habits/:id  — includes last 30 days of history */
export type GetHabitResponse = ApiResponse<Habit>

/** PATCH /api/v1/habits/:id */
export type UpdateHabitRequest  = UpdateHabitInput
export type UpdateHabitResponse = ApiResponse<Habit>

/** DELETE /api/v1/habits/:id — hard delete. Deducts all XP this habit ever
 * earned and recalculates level/rank/streak accordingly. */
export type DeleteHabitResponse = ApiResponse<{
  id:          string
  deleted:     true
  xpDeducted:  number
  newXp:       number
  newLevel:    number
  newRank:     RankTier
  leveledDown: boolean
}>

/** POST /api/v1/habits/:id/log */
export type LogHabitRequest  = LogHabitInput
export type LogHabitResponse = ApiResponse<{
  log: HabitLog
  xpAwarded: number
  newStreak: number
  leveledUp: boolean
}>

/** DELETE /api/v1/habits/:id/log/:date  (date = YYYY-MM-DD) */
export type UndoHabitLogResponse = ApiResponse<{ deleted: true }>

/** GET /api/v1/habits/:id/stats */
export type GetHabitStatsResponse = ApiResponse<HabitStats>

// ─────────────────────────────────────────────────────────────
// QUESTS
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/quests/daily */
export type GetDailyQuestsResponse = ApiResponse<DailyQuest[]>

/** POST /api/v1/quests/:id/complete */
export type CompleteQuestResponse = ApiResponse<CompleteQuestResult>

/** GET /api/v1/quests/history?page=&limit=&completed= */
export interface QuestHistoryParams extends PaginationParams {
  completed?: boolean
}
export type GetQuestHistoryResponse = PaginatedResponse<DailyQuest>

// ─────────────────────────────────────────────────────────────
// XP
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/xp/transactions?page=&limit= */
export type ListXpTransactionsResponse = PaginatedResponse<XpTransaction>

/** GET /api/v1/xp/summary */
export type GetXpSummaryResponse = ApiResponse<XpSummary>

/** GET /api/v1/xp/level-map */
export type GetLevelMapResponse = ApiResponse<LevelConfig[]>

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/achievements */
export type ListAchievementsResponse = ApiResponse<Achievement[]>

/** GET /api/v1/achievements/unlocked */
export type ListUnlockedAchievementsResponse = ApiResponse<UserAchievement[]>

/** GET /api/v1/achievements/:id */
export type GetAchievementResponse = ApiResponse<Achievement>

// ─────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/analytics/scores/today */
export type GetTodayScoresResponse = ApiResponse<AnalyticsScores>

/** GET /api/v1/analytics/scores/history?period=week|month|year */
export type ScoreHistoryParams = { period: 'week' | 'month' | 'year' } & Record<string, string>
export type GetScoreHistoryResponse = ApiResponse<AnalyticsScores[]>

/** GET /api/v1/analytics/radar */
export type GetRadarDataResponse = ApiResponse<RadarChartData[]>

/** GET /api/v1/analytics/trends?period=week|month|year */
export type GetAnalyticsTrendsResponse = ApiResponse<AnalyticsTrend>

// ─────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/reports/daily|weekly|monthly|yearly */
export type GetReportResponse = ApiResponse<ReportData>

/** POST /api/v1/reports/generate */
export interface GenerateReportInput { period: ReportPeriod }
export type GenerateReportResponse = ApiResponse<ReportData>

/** GET /api/v1/reports/history?page=&limit= */
export type ListReportsResponse = PaginatedResponse<Pick<ReportData, 'period' | 'periodStart' | 'periodEnd' | 'summary'>>

// ─────────────────────────────────────────────────────────────
// COMMUNITY — FRIENDS
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/friends */
export type ListFriendsResponse = ApiResponse<FriendProfile[]>

/** GET /api/v1/friends/requests */
export type ListFriendRequestsResponse = ApiResponse<Friendship[]>

/** POST /api/v1/friends/request */
export interface SendFriendRequestInput { addresseeId: string }
export type SendFriendRequestResponse = ApiResponse<Friendship>

/** POST /api/v1/friends/accept/:id */
export type AcceptFriendRequestResponse = ApiResponse<Friendship>

/** POST /api/v1/friends/decline/:id */
export type DeclineFriendRequestResponse = ApiResponse<{ id: string }>

/** DELETE /api/v1/friends/:id */
export type RemoveFriendResponse = ApiResponse<{ id: string }>

// ─────────────────────────────────────────────────────────────
// COMMUNITY — LEADERBOARD
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/leaderboard?period=weekly|monthly|yearly&page=&limit= */
export interface LeaderboardParams extends PaginationParams {
  period: ReportPeriod
}
export type GetLeaderboardResponse = PaginatedResponse<LeaderboardEntry>

/** GET /api/v1/leaderboard/friends?period= */
export type GetFriendsLeaderboardResponse = ApiResponse<LeaderboardEntry[]>

// ─────────────────────────────────────────────────────────────
// COMMUNITY — ACTIVITY FEED
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/feed?page=&limit= */
export type GetFeedResponse = PaginatedResponse<ActivityFeedItem>

/** GET /api/v1/feed/global?page=&limit= */
export type GetGlobalFeedResponse = PaginatedResponse<ActivityFeedItem>

// ─────────────────────────────────────────────────────────────
// COMMUNITY — GROUPS
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/groups?page=&limit= */
export type ListGroupsResponse = PaginatedResponse<Group>

/** POST /api/v1/groups */
export type CreateGroupRequest  = CreateGroupInput
export type CreateGroupResponse = ApiResponse<Group>

/** GET /api/v1/groups/:id */
export type GetGroupResponse = ApiResponse<Group>

/** PATCH /api/v1/groups/:id */
export type UpdateGroupRequest  = Partial<CreateGroupInput>
export type UpdateGroupResponse = ApiResponse<Group>

/** DELETE /api/v1/groups/:id */
export type DeleteGroupResponse = ApiResponse<{ id: string }>

/** POST /api/v1/groups/:id/join */
export type JoinGroupResponse = ApiResponse<GroupMember>

/** POST /api/v1/groups/:id/leave */
export type LeaveGroupResponse = ApiResponse<{ ok: true }>

/** DELETE /api/v1/groups/:id/members/:uid */
export type KickMemberResponse = ApiResponse<{ userId: string }>

// ─────────────────────────────────────────────────────────────
// COMMUNITY — CHALLENGES
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/challenges?page=&limit= */
export type ListChallengesResponse = PaginatedResponse<Challenge>

/** POST /api/v1/challenges */
export type CreateChallengeRequest  = CreateChallengeInput
export type CreateChallengeResponse = ApiResponse<Challenge>

/** GET /api/v1/challenges/:id */
export type GetChallengeResponse = ApiResponse<Challenge>

/** POST /api/v1/challenges/:id/join */
export type JoinChallengeResponse = ApiResponse<ChallengeParticipant>

/** PATCH /api/v1/challenges/:id/progress */
export type UpdateChallengeProgressRequest  = UpdateChallengeProgressInput
export type UpdateChallengeProgressResponse = ApiResponse<ChallengeParticipant>

/** GET /api/v1/challenges/:id/leaderboard?page=&limit= */
export type GetChallengeLeaderboardResponse = PaginatedResponse<ChallengeParticipant>

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/notifications?page=&limit=&read= */
export interface ListNotificationsParams extends PaginationParams {
  read?: boolean
}
export type ListNotificationsResponse = PaginatedResponse<Notification>

/** PATCH /api/v1/notifications/:id/read */
export type MarkNotificationReadResponse = ApiResponse<Notification>

/** POST /api/v1/notifications/read-all */
export type MarkAllNotificationsReadResponse = ApiResponse<{ updated: number }>

/** DELETE /api/v1/notifications/:id */
export type DeleteNotificationResponse = ApiResponse<{ id: string }>

/** GET /api/v1/notifications/unread-count */
export type GetUnreadCountResponse = ApiResponse<UnreadCountResponse>

// ─────────────────────────────────────────────────────────────
// AI INSIGHTS
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/insights */
export type ListInsightsResponse = ApiResponse<AiInsight[]>

/** POST /api/v1/insights/:id/dismiss */
export type DismissInsightResponse = ApiResponse<{ id: string }>

/** POST /api/v1/insights/refresh */
export type RefreshInsightsResponse = ApiResponse<AiInsight[]>

// ─────────────────────────────────────────────────────────────
// CATEGORIES  (seeded data, rarely changes)
// ─────────────────────────────────────────────────────────────

/** GET /api/v1/categories */
export type ListCategoriesResponse = ApiResponse<Category[]>
