// ============================================================
// SOLO LEVELING — SHARED API CONTRACTS
// Single source of truth for frontend ↔ backend communication
//
// Usage:
//   Backend (Next.js API routes):  import type { ... } from '@/types'
//   Frontend (React/Vite app):     import type { ... } from '@shared/types'
//
// Rule: If it crosses the network, it lives here.
//       UI-only concerns (LucideIcon refs, local state) stay in
//       the frontend's own types/ui.ts — never import those here.
// ============================================================

// ─────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────

/** E → D → C → B → A → S → National → Monarch */
export type RankTier =
  | 'E'
  | 'D'
  | 'C'
  | 'B'
  | 'A'
  | 'S'
  | 'National'
  | 'Monarch'

export type GoalPeriod    = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
export type GoalStatus    = 'active' | 'completed' | 'failed' | 'paused'

/**
 * Numeric difficulty for API transport.
 * Maps to: easy=1  normal=2  hard=3  elite=4  legendary=5
 * Frontend renders labels; backend stores the enum string.
 */
export type QuestDifficulty    = 'easy' | 'normal' | 'hard' | 'elite' | 'legendary'
export type QuestDifficultyNum = 1 | 2 | 3 | 4 | 5

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type NotificationType =
  | 'quest'
  | 'achievement'
  | 'streak'
  | 'social'
  | 'challenge'
  | 'system'
  | 'report'

export type FriendStatus   = 'pending' | 'accepted' | 'blocked'
export type ChallengeStatus = 'open' | 'active' | 'completed' | 'cancelled'
export type ReportPeriod   = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type InsightType    = 'insight' | 'suggestion' | 'warning'
export type ActivityAction = 'completed' | 'achieved' | 'leveled_up' | 'started' | 'joined'
export type OnlineStatus   = 'online' | 'away' | 'offline'

// ─────────────────────────────────────────────────────────────
// RANK METADATA  (replaces the frontend's RANKS constant)
// Returned by GET /api/v1/xp/level-map; no LucideIcon here.
// ─────────────────────────────────────────────────────────────

export interface RankInfo {
  rank: RankTier
  /** Display label e.g. "Weakest", "Legend", "Shadow Monarch" */
  label: string
  /** Minimum level to reach this rank */
  minLevel: number
  /** Hex colour for UI theming */
  color: string
  /** Total XP required to reach this rank */
  xpRequired: number
}

// ─────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────

/**
 * Full profile returned to the authenticated user.
 * Replaces the frontend's `User` interface.
 *
 * ⚠ Renamed fields from the old frontend type:
 *   name        → displayName
 *   avatar      → avatarUrl  (may be null)
 *   maxXp       → xpToNextLevel
 *   streak      → currentStreak
 *   achievements → achievementsCount
 *   powerScore  → (removed — not in DB; compute from other scores on FE if needed)
 */
export interface Profile {
  id:           string
  username:     string
  displayName:  string
  avatarUrl:    string | null
  bio:          string | null
  email:        string           // present only on /profile/me
  timezone:     string

  // XP & Level
  xp:            number
  level:         number
  rank:          RankTier
  xpToNextLevel: number          // ≡ old "maxXp"

  // Streaks
  currentStreak: number          // ≡ old "streak"
  maxStreak:     number
  lastActiveDate: string | null  // ISO date YYYY-MM-DD

  // Counters
  questsCompleted:   number
  habitsTracked:     number
  achievementsCount: number      // ≡ old "achievements"
  totalXpEarned:     number

  // Analytics scores — all 0-100
  lifeScore:        number
  disciplineScore:  number
  growthScore:      number
  healthScore:      number
  learningScore:    number
  productivityScore: number
  relationshipScore: number
  xpEarnedToday:    number  // total XP from all sources today
  // NOTE: "powerScore" from the frontend mock is not persisted.
  // The closest equivalent is productivityScore or a client-side
  // average. Do NOT add it to the DB schema.

  // Onboarding
  onboardingCompleted: boolean
  onboardingStep:      number

  // Settings
  isPublic:            boolean
  emailNotifications:  boolean
  pushNotifications:   boolean

  createdAt: string
  updatedAt: string
}

/** Minimal projection used in feeds, leaderboards, friend lists */
export type ProfileSummary = Pick<
  Profile,
  'id' | 'username' | 'displayName' | 'avatarUrl' | 'rank' | 'level'
>

export interface UpdateProfileInput {
  displayName?:       string
  bio?:               string
  timezone?:          string
  isPublic?:          boolean
  emailNotifications?: boolean
  pushNotifications?: boolean
}

// ─────────────────────────────────────────────────────────────
// CATEGORY
// ─────────────────────────────────────────────────────────────

/**
 * ⚠ The `icon` field in the frontend was a LucideIcon component.
 * The API sends `iconName` (string, e.g. "Dumbbell") and the
 * frontend resolves it to a component locally.
 */
export interface Category {
  id:          string
  name:        string
  slug:        string
  /** Lucide icon name — frontend maps this to the actual component */
  iconName:    string
  /** Hex colour */
  color:       string
  description: string | null
  sortOrder:   number
  isSystem:    boolean
  createdAt:   string
}

// ─────────────────────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────────────────────

export interface GoalMilestone {
  id:          string
  goalId:      string
  title:       string
  completed:   boolean
  sortOrder:   number
  xpReward:    number
  completedAt: string | null
  createdAt:   string
}

export interface Goal {
  id:           string
  userId:       string
  categoryId:   string | null
  category?:    Category
  title:        string
  description:  string | null
  period:       GoalPeriod
  status:       GoalStatus
  /** 0–100 */
  progress:     number
  targetValue:  number | null
  currentValue: number | null
  unit:         string | null
  xpReward:     number
  /** ISO date */
  deadline:     string | null
  startDate:    string
  completedAt:  string | null
  isPinned:     boolean
  sortOrder:    number
  milestones:   GoalMilestone[]
  createdAt:    string
  updatedAt:    string
}

export interface CreateGoalInput {
  title:        string
  description?: string
  categoryId?:  string
  period:       GoalPeriod
  targetValue?: number
  unit?:        string
  xpReward?:    number
  deadline?:    string
  milestones?:  Array<{ title: string; xpReward?: number }>
}

export interface UpdateGoalInput {
  title?:        string
  description?:  string
  categoryId?:   string
  status?:       GoalStatus
  progress?:     number
  currentValue?: number
  deadline?:     string
  isPinned?:     boolean
}

export interface UpdateGoalProgressInput {
  /** 0–100 */
  progress:      number
  currentValue?: number
}

// ─────────────────────────────────────────────────────────────
// HABITS
// ─────────────────────────────────────────────────────────────

/**
 * ⚠ Frontend `Habit.completion` was `number[]` (binary array of last 14 days).
 * The API returns `completionHistory: HabitLog[]` — the frontend must derive
 * the boolean array locally from log dates.
 */
export interface HabitLog {
  id:          string
  habitId:     string
  userId:      string
  /** ISO date YYYY-MM-DD */
  loggedDate:  string
  completed:   boolean
  note:        string | null
  xpEarned:    number
  createdAt:   string
}

export interface Habit {
  id:               string
  userId:           string
  categoryId:       string | null
  category?:        Category
  name:             string
  description:      string | null
  /** Lucide icon name */
  iconName:         string
  /** Hex colour */
  color:            string
  weeklyTarget:     number
  xpPerCompletion:  number
  currentStreak:    number
  maxStreak:        number
  totalCompletions: number
  isActive:         boolean
  sortOrder:        number
  // Computed fields — present on GET, absent on mutating responses
  weeklyCompleted?:    number
  /** Last 30 days of logs, newest first */
  completionHistory?:  HabitLog[]
  /** 0–1 completion rate over last 14 days */
  completionRate?:     number
  createdAt:           string
  updatedAt:           string
}

export interface CreateHabitInput {
  name:             string
  description?:     string
  categoryId?:      string
  iconName?:        string
  color?:           string
  weeklyTarget?:    number
  xpPerCompletion?: number
}

export interface UpdateHabitInput {
  name?:            string
  description?:     string
  categoryId?:      string
  iconName?:        string
  color?:           string
  weeklyTarget?:    number
  xpPerCompletion?: number
  isActive?:        boolean
}

export interface LogHabitInput {
  /** ISO date YYYY-MM-DD — defaults to today if omitted */
  loggedDate?: string
  note?:       string
}

export interface HabitStats {
  habitId:           string
  completionRate14d: number
  completionRate30d: number
  currentStreak:     number
  maxStreak:         number
  totalCompletions:  number
  streakHistory:     Array<{ date: string; streak: number }>
}

// ─────────────────────────────────────────────────────────────
// XP & LEVELS
// ─────────────────────────────────────────────────────────────

export interface XpTransaction {
  id:           string
  userId:       string
  amount:       number
  sourceType:   'quest' | 'habit' | 'goal' | 'achievement' | 'challenge' | 'bonus'
  sourceId:     string | null
  description:  string
  balanceAfter: number
  createdAt:    string
}

export interface LevelConfig {
  level:          number
  xpRequired:     number
  rank:           RankTier
  title:          string
  xpMultiplier:   number
}

export interface AwardXpResult {
  newXp:     number
  newLevel:  number
  leveledUp: boolean
  newRank:   RankTier
}

export interface XpSummary {
  today:   number
  week:    number
  month:   number
  allTime: number
}

// ─────────────────────────────────────────────────────────────
// QUESTS
// ─────────────────────────────────────────────────────────────

/**
 * ⚠ Frontend `Quest.difficulty` was `number` (1–5 scale).
 * The API uses the string enum. Convert with DIFFICULTY_NUM below.
 */
export const DIFFICULTY_NUM: Record<QuestDifficulty, QuestDifficultyNum> = {
  easy:      1,
  normal:    2,
  hard:      3,
  elite:     4,
  legendary: 5,
}

export interface QuestTemplate {
  id:          string
  categoryId:  string | null
  category?:   Category
  title:       string
  description: string | null
  difficulty:  QuestDifficulty
  xpReward:    number
  minLevel:    number
  maxLevel:    number | null
  isActive:    boolean
  weight:      number
  createdAt:   string
}

export interface DailyQuest {
  id:          string
  userId:      string
  templateId:  string | null
  title:       string
  description: string | null
  categoryId:  string | null
  category?:   Category
  difficulty:  QuestDifficulty
  /** Use DIFFICULTY_NUM[difficulty] on the frontend for numeric display */
  xpReward:    number
  completed:   boolean
  completedAt: string | null
  questDate:   string
  expiresAt:   string
  isBonus:     boolean
  createdAt:   string
}

export interface CompleteQuestResult {
  quest:                DailyQuest
  xpAwarded:            number
  leveledUp:            boolean
  newLevel:             number
  newRank:              RankTier
  achievementsUnlocked: Achievement[]
}

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────────────────────────

/**
 * ⚠ Frontend `Achievement.icon` was LucideIcon.
 * The API sends `iconName` (string). Frontend resolves locally.
 */
export interface Achievement {
  id:           string
  slug:         string
  title:        string
  description:  string
  /** Lucide icon name */
  iconName:     string
  rarity:       AchievementRarity
  xpBonus:      number
  badgeUrl:     string | null
  triggerType:  string
  triggerValue: Record<string, unknown>
  isSecret:     boolean
  sortOrder:    number
  // Joined from user_achievements when authenticated
  unlocked?:    boolean
  unlockedAt?:  string | null
  xpAwarded?:   number
  createdAt:    string
}

export interface UserAchievement {
  id:            string
  userId:        string
  achievementId: string
  achievement?:  Achievement
  unlockedAt:    string
  xpAwarded:     number
}

// ─────────────────────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────────────────────

export interface AnalyticsScores {
  id:                  string
  userId:              string
  scoreDate:           string
  lifeScore:           number
  disciplineScore:     number
  growthScore:         number
  healthScore:         number
  learningScore:       number
  productivityScore:   number
  relationshipScore:   number
  questsDone:          number
  questsTotal:         number
  habitsDone:          number
  habitsTotal:         number
  streakDays:          number
  xpEarnedToday:       number
  computedAt:          string
}

/** One data point in a trend series — used for charts */
export interface AnalyticsTrendPoint {
  date:              string
  lifeScore:         number
  disciplineScore:   number
  growthScore:       number
  healthScore:       number
  learningScore:     number
  productivityScore: number
  relationshipScore: number
  xpEarned:          number
}

export interface AnalyticsTrend {
  period:   'week' | 'month' | 'year'
  data:     AnalyticsTrendPoint[]
  averages: Omit<AnalyticsScores, 'id' | 'userId' | 'scoreDate' | 'computedAt'>
}

/** 7-axis data for the radar chart on the Analytics page */
export interface RadarChartData {
  subject: string   // e.g. "Discipline"
  score:   number   // 0–100
  fullMark: 100
}

// ─────────────────────────────────────────────────────────────
// REPORTS
// ─────────────────────────────────────────────────────────────

export interface ReportData {
  period:      ReportPeriod
  periodStart: string
  periodEnd:   string
  summary: {
    totalXpEarned:          number
    questsCompleted:        number
    habitsCompleted:        number
    achievementsUnlocked:   number
    streakHighest:          number
    levelsGained:           number
  }
  scores: {
    avg:   AnalyticsScores
    trend: 'up' | 'down' | 'stable'
    delta: number
  }
  topHabits:             Array<{ name: string; completionRate: number; streak: number }>
  completedGoals:        Goal[]
  unlockedAchievements:  Achievement[]
  xpByCategory:          Array<{ category: string; xp: number }>
}

// ─────────────────────────────────────────────────────────────
// COMMUNITY — FRIENDS
// ─────────────────────────────────────────────────────────────

/**
 * ⚠ Frontend `Friend.lastActive` was a relative string ("2 hours ago").
 * The API returns an ISO timestamp; format it on the frontend.
 */
export interface Friendship {
  id:          string
  requesterId: string
  addresseeId: string
  status:      FriendStatus
  requester?:  Profile
  addressee?:  Profile
  createdAt:   string
  updatedAt:   string
}

export interface FriendProfile extends ProfileSummary {
  friendshipId:  string
  onlineStatus:  OnlineStatus
  /** ISO timestamp — format to relative time on the frontend */
  lastActiveAt:  string | null
}

// ─────────────────────────────────────────────────────────────
// COMMUNITY — GROUPS
// ─────────────────────────────────────────────────────────────

export interface Group {
  id:          string
  ownerId:     string
  owner?:      ProfileSummary
  name:        string
  description: string | null
  avatarUrl:   string | null
  isPublic:    boolean
  maxMembers:  number
  memberCount: number
  members?:    GroupMember[]
  createdAt:   string
  updatedAt:   string
}

export interface GroupMember {
  id:        string
  groupId:   string
  userId:    string
  profile?:  ProfileSummary
  role:      'owner' | 'admin' | 'member'
  joinedAt:  string
}

export interface CreateGroupInput {
  name:        string
  description?: string
  isPublic?:   boolean
  maxMembers?: number
}

// ─────────────────────────────────────────────────────────────
// COMMUNITY — CHALLENGES
// ─────────────────────────────────────────────────────────────

/**
 * ⚠ Frontend `Challenge.difficulty` was `number`.
 * ⚠ Frontend `Challenge.duration` was a display string ("7 days").
 * Both are replaced with proper typed fields below.
 */
export interface Challenge {
  id:               string
  creatorId:        string
  creator?:         ProfileSummary
  groupId:          string | null
  title:            string
  description:      string | null
  difficulty:       QuestDifficulty   // string enum, not number
  xpReward:         number
  status:           ChallengeStatus
  startDate:        string
  endDate:          string
  maxParticipants:  number | null
  participantCount: number
  goalType:         string
  goalTarget:       Record<string, unknown>
  // Present when current user has joined
  userParticipant?: ChallengeParticipant
  createdAt:        string
  updatedAt:        string
}

export interface ChallengeParticipant {
  id:           string
  challengeId:  string
  userId:       string
  profile?:     ProfileSummary
  progress:     number
  completed:    boolean
  completedAt:  string | null
  rankPosition: number | null
  xpEarned:     number
  joinedAt:     string
}

export interface CreateChallengeInput {
  title:           string
  description?:    string
  difficulty:      QuestDifficulty
  xpReward?:       number
  startDate:       string
  endDate:         string
  maxParticipants?: number
  groupId?:        string
  goalType:        string
  goalTarget:      Record<string, unknown>
}

export interface UpdateChallengeProgressInput {
  progress: number
}

// ─────────────────────────────────────────────────────────────
// COMMUNITY — LEADERBOARD & FEED
// ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  userId:       string
  profile:      ProfileSummary
  rankPosition: number
  xpEarned:     number
  period:       ReportPeriod
  periodStart:  string
}

export interface ActivityFeedItem {
  id:         string
  userId:     string
  user?:      ProfileSummary
  action:     ActivityAction
  target:     string
  sourceType: string
  sourceId:   string | null
  xpEarned:   number
  isPublic:   boolean
  /** ISO timestamp — format to relative time on the frontend */
  createdAt:  string
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

/**
 * ⚠ Frontend `Notification.time` was a display string ("2 hours ago").
 * The API returns `createdAt` (ISO timestamp); format on the frontend.
 */
export interface Notification {
  id:        string
  userId:    string
  type:      NotificationType
  title:     string
  message:   string
  data:      Record<string, unknown>
  read:      boolean
  readAt:    string | null
  /** ISO timestamp — format to relative time on the frontend */
  createdAt: string
}

export interface UnreadCountResponse {
  count: number
}

// ─────────────────────────────────────────────────────────────
// AI INSIGHTS
// ─────────────────────────────────────────────────────────────

export interface AiInsight {
  id:         string
  userId:     string
  type:       InsightType
  title:      string
  message:    string
  action:     string | null
  dismissed:  boolean
  expiresAt:  string | null
  createdAt:  string
}

// ─────────────────────────────────────────────────────────────
// API RESPONSE WRAPPERS
// ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  meta?: {
    total?:   number
    page?:    number
    limit?:   number
    hasMore?: boolean
  }
}

export interface ApiError {
  code:       string
  message:    string
  details?:   Record<string, string[]>
  statusCode: number
}

export interface PaginationParams {
  page?:   number
  limit?:  number
  cursor?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total:        number
    page:         number
    limit:        number
    hasMore:      boolean
    nextCursor?:  string
  }
}

// ─────────────────────────────────────────────────────────────
// INTERNAL EVENT BUS PAYLOADS
// (backend only — do not use on the frontend)
// ─────────────────────────────────────────────────────────────

export interface QuestCompletedEvent {
  userId:     string
  questId:    string
  xpAwarded:  number
  timestamp:  string
}

export interface HabitLoggedEvent {
  userId:     string
  habitId:    string
  loggedDate: string
  xpAwarded:  number
  newStreak:  number
  timestamp:  string
}

export interface GoalProgressedEvent {
  userId:      string
  goalId:      string
  oldProgress: number
  newProgress: number
  completed:   boolean
  timestamp:   string
}

export interface AchievementUnlockedEvent {
  userId:          string
  achievementId:   string
  achievementSlug: string
  xpBonus:         number
  timestamp:       string
}

export interface LevelUpEvent {
  userId:   string
  oldLevel: number
  newLevel: number
  newRank:  RankTier
  timestamp: string
}

export type AppEvent =
  | { type: 'QUEST_COMPLETED';      payload: QuestCompletedEvent }
  | { type: 'HABIT_LOGGED';         payload: HabitLoggedEvent }
  | { type: 'GOAL_PROGRESSED';      payload: GoalProgressedEvent }
  | { type: 'ACHIEVEMENT_UNLOCKED'; payload: AchievementUnlockedEvent }
  | { type: 'LEVEL_UP';             payload: LevelUpEvent }

