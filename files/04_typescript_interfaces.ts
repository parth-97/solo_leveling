// ============================================================
// SOLO LEVELING — COMPLETE TYPESCRIPT INTERFACES
// Matches database schema + frontend expectations
// ============================================================

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────
export type RankTier = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'National' | 'Monarch'
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
export type GoalStatus = 'active' | 'completed' | 'failed' | 'paused'
export type QuestDifficulty = 'easy' | 'normal' | 'hard' | 'elite' | 'legendary'
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type NotificationType = 'quest' | 'achievement' | 'streak' | 'social' | 'challenge' | 'system' | 'report'
export type FriendStatus = 'pending' | 'accepted' | 'blocked'
export type ChallengeStatus = 'open' | 'active' | 'completed' | 'cancelled'
export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type InsightType = 'insight' | 'suggestion' | 'warning'
export type ActivityAction = 'completed' | 'achieved' | 'leveled_up' | 'started' | 'joined'

// ─────────────────────────────────────────
// CORE ENTITIES
// ─────────────────────────────────────────

export interface Profile {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  timezone: string

  // XP & Level
  xp: number
  level: number
  rank: RankTier
  xpToNextLevel: number

  // Streaks
  currentStreak: number
  maxStreak: number
  lastActiveDate: string | null

  // Counters
  questsCompleted: number
  habitsTracked: number
  achievementsCount: number
  totalXpEarned: number

  // Onboarding
  onboardingCompleted: boolean
  onboardingStep: number

  // Settings
  isPublic: boolean
  emailNotifications: boolean
  pushNotifications: boolean

  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  iconName: string
  color: string
  description: string | null
  sortOrder: number
  isSystem: boolean
  createdAt: string
}

// ─────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────

export interface Goal {
  id: string
  userId: string
  categoryId: string | null
  category?: Category
  title: string
  description: string | null
  period: GoalPeriod
  status: GoalStatus
  progress: number          // 0–100
  targetValue: number | null
  currentValue: number | null
  unit: string | null
  xpReward: number
  deadline: string | null   // ISO date
  startDate: string
  completedAt: string | null
  isPinned: boolean
  sortOrder: number
  milestones: GoalMilestone[]
  createdAt: string
  updatedAt: string
}

export interface GoalMilestone {
  id: string
  goalId: string
  title: string
  completed: boolean
  sortOrder: number
  xpReward: number
  completedAt: string | null
  createdAt: string
}

export interface CreateGoalInput {
  title: string
  description?: string
  categoryId?: string
  period: GoalPeriod
  targetValue?: number
  unit?: string
  xpReward?: number
  deadline?: string
  milestones?: { title: string; xpReward?: number }[]
}

export interface UpdateGoalInput {
  title?: string
  description?: string
  categoryId?: string
  status?: GoalStatus
  progress?: number
  currentValue?: number
  deadline?: string
  isPinned?: boolean
}

// ─────────────────────────────────────────
// HABITS
// ─────────────────────────────────────────

export interface Habit {
  id: string
  userId: string
  categoryId: string | null
  category?: Category
  name: string
  description: string | null
  iconName: string
  color: string
  weeklyTarget: number
  xpPerCompletion: number
  currentStreak: number
  maxStreak: number
  totalCompletions: number
  isActive: boolean
  sortOrder: number
  // Computed on read
  weeklyCompleted?: number
  completionHistory?: HabitLog[]
  completionRate?: number   // 0–1 over last 14 days
  createdAt: string
  updatedAt: string
}

export interface HabitLog {
  id: string
  habitId: string
  userId: string
  loggedDate: string   // ISO date
  completed: boolean
  note: string | null
  xpEarned: number
  createdAt: string
}

export interface CreateHabitInput {
  name: string
  description?: string
  categoryId?: string
  iconName?: string
  color?: string
  weeklyTarget?: number
  xpPerCompletion?: number
}

// ─────────────────────────────────────────
// XP & LEVELS
// ─────────────────────────────────────────

export interface XpTransaction {
  id: string
  userId: string
  amount: number
  sourceType: 'quest' | 'habit' | 'goal' | 'achievement' | 'challenge' | 'bonus'
  sourceId: string | null
  description: string
  balanceAfter: number
  createdAt: string
}

export interface LevelConfig {
  level: number
  xpRequired: number
  rank: RankTier
  title: string
  xpMultiplier: number
}

export interface AwardXpResult {
  newXp: number
  newLevel: number
  leveledUp: boolean
  newRank: RankTier
}

// ─────────────────────────────────────────
// QUESTS
// ─────────────────────────────────────────

export interface QuestTemplate {
  id: string
  categoryId: string | null
  category?: Category
  title: string
  description: string | null
  difficulty: QuestDifficulty
  xpReward: number
  minLevel: number
  maxLevel: number | null
  isActive: boolean
  weight: number
  createdAt: string
}

export interface DailyQuest {
  id: string
  userId: string
  templateId: string | null
  title: string
  description: string | null
  categoryId: string | null
  category?: Category
  difficulty: QuestDifficulty
  xpReward: number
  completed: boolean
  completedAt: string | null
  questDate: string
  expiresAt: string
  isBonus: boolean
  createdAt: string
}

export interface CompleteQuestResult {
  quest: DailyQuest
  xpAwarded: number
  leveledUp: boolean
  newLevel: number
  newRank: RankTier
  achievementsUnlocked: Achievement[]
}

// ─────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────

export interface Achievement {
  id: string
  slug: string
  title: string
  description: string
  iconName: string
  rarity: AchievementRarity
  xpBonus: number
  badgeUrl: string | null
  triggerType: string
  triggerValue: Record<string, unknown>
  isSecret: boolean
  sortOrder: number
  // Joined from user_achievements
  unlocked?: boolean
  unlockedAt?: string | null
  xpAwarded?: number
  createdAt: string
}

export interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  achievement?: Achievement
  unlockedAt: string
  xpAwarded: number
}

// ─────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────

export interface AnalyticsScores {
  id: string
  userId: string
  scoreDate: string
  lifeScore: number
  disciplineScore: number
  growthScore: number
  healthScore: number
  learningScore: number
  productivityScore: number
  relationshipScore: number
  questsDone: number
  questsTotal: number
  habitsDone: number
  habitsTotal: number
  streakDays: number
  xpEarnedToday: number
  computedAt: string
}

export interface AnalyticsTrend {
  period: 'week' | 'month' | 'year'
  data: Array<{
    date: string
    lifeScore: number
    disciplineScore: number
    growthScore: number
    healthScore: number
    learningScore: number
    productivityScore: number
    relationshipScore: number
    xpEarned: number
  }>
  averages: Omit<AnalyticsScores, 'id' | 'userId' | 'scoreDate' | 'computedAt'>
}

// ─────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────

export interface ReportData {
  period: ReportPeriod
  periodStart: string
  periodEnd: string
  summary: {
    totalXpEarned: number
    questsCompleted: number
    habitsCompleted: number
    achievementsUnlocked: number
    streakHighest: number
    levelsGained: number
  }
  scores: {
    avg: AnalyticsScores
    trend: 'up' | 'down' | 'stable'
    delta: number
  }
  topHabits: Array<{ name: string; completionRate: number; streak: number }>
  completedGoals: Goal[]
  unlockedAchievements: Achievement[]
  xpByCategory: Array<{ category: string; xp: number }>
}

// ─────────────────────────────────────────
// COMMUNITY
// ─────────────────────────────────────────

export interface Friendship {
  id: string
  requesterId: string
  addresseeId: string
  status: FriendStatus
  requester?: Profile
  addressee?: Profile
  createdAt: string
  updatedAt: string
}

export interface FriendProfile extends Profile {
  friendshipId: string
  onlineStatus: 'online' | 'away' | 'offline'
  lastActiveAt: string | null
}

export interface Group {
  id: string
  ownerId: string
  owner?: Profile
  name: string
  description: string | null
  avatarUrl: string | null
  isPublic: boolean
  maxMembers: number
  memberCount: number
  members?: GroupMember[]
  createdAt: string
  updatedAt: string
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  profile?: Profile
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

export interface Challenge {
  id: string
  creatorId: string
  creator?: Profile
  groupId: string | null
  title: string
  description: string | null
  difficulty: QuestDifficulty
  xpReward: number
  status: ChallengeStatus
  startDate: string
  endDate: string
  maxParticipants: number | null
  participantCount: number
  goalType: string
  goalTarget: Record<string, unknown>
  // Joined for current user
  userParticipant?: ChallengeParticipant
  createdAt: string
  updatedAt: string
}

export interface ChallengeParticipant {
  id: string
  challengeId: string
  userId: string
  profile?: Profile
  progress: number
  completed: boolean
  completedAt: string | null
  rankPosition: number | null
  xpEarned: number
  joinedAt: string
}

export interface LeaderboardEntry {
  userId: string
  profile: Pick<Profile, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'rank' | 'level'>
  rankPosition: number
  xpEarned: number
  period: ReportPeriod
  periodStart: string
}

export interface ActivityFeedItem {
  id: string
  userId: string
  user?: Pick<Profile, 'id' | 'username' | 'displayName' | 'avatarUrl' | 'rank' | 'level'>
  action: ActivityAction
  target: string
  sourceType: string
  sourceId: string | null
  xpEarned: number
  isPublic: boolean
  createdAt: string
}

// ─────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, unknown>
  read: boolean
  readAt: string | null
  createdAt: string
}

// ─────────────────────────────────────────
// AI INSIGHTS
// ─────────────────────────────────────────

export interface AiInsight {
  id: string
  userId: string
  type: InsightType
  title: string
  message: string
  action: string | null
  dismissed: boolean
  expiresAt: string | null
  createdAt: string
}

// ─────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  meta?: {
    total?: number
    page?: number
    limit?: number
    hasMore?: boolean
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
  statusCode: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  cursor?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    hasMore: boolean
    nextCursor?: string
  }
}

// ─────────────────────────────────────────
// EVENT PAYLOADS  (for internal event bus)
// ─────────────────────────────────────────

export interface QuestCompletedEvent {
  userId: string
  questId: string
  xpAwarded: number
  timestamp: string
}

export interface HabitLoggedEvent {
  userId: string
  habitId: string
  loggedDate: string
  xpAwarded: number
  newStreak: number
  timestamp: string
}

export interface GoalProgressedEvent {
  userId: string
  goalId: string
  oldProgress: number
  newProgress: number
  completed: boolean
  timestamp: string
}

export interface AchievementUnlockedEvent {
  userId: string
  achievementId: string
  achievementSlug: string
  xpBonus: number
  timestamp: string
}

export interface LevelUpEvent {
  userId: string
  oldLevel: number
  newLevel: number
  newRank: RankTier
  timestamp: string
}

export type AppEvent =
  | { type: 'QUEST_COMPLETED';    payload: QuestCompletedEvent }
  | { type: 'HABIT_LOGGED';       payload: HabitLoggedEvent }
  | { type: 'GOAL_PROGRESSED';    payload: GoalProgressedEvent }
  | { type: 'ACHIEVEMENT_UNLOCKED'; payload: AchievementUnlockedEvent }
  | { type: 'LEVEL_UP';           payload: LevelUpEvent }
