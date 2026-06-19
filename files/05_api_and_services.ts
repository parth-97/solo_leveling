// ============================================================
// SOLO LEVELING — API ENDPOINTS SPECIFICATION
// Next.js App Router  |  /api/v1/...
// ============================================================

/*
════════════════════════════════════════════════════════════════
  AUTHENTICATION ENDPOINTS
════════════════════════════════════════════════════════════════
All auth is handled by Supabase Auth. The backend exposes:

POST   /api/v1/auth/callback          Supabase OAuth callback handler
POST   /api/v1/auth/refresh           Refresh access token
POST   /api/v1/auth/signout           Sign out + invalidate session

════════════════════════════════════════════════════════════════
  PROFILE ENDPOINTS
════════════════════════════════════════════════════════════════
GET    /api/v1/profile/me             Fetch own profile (full)
PATCH  /api/v1/profile/me             Update profile fields
GET    /api/v1/profile/:username      Public profile by username
GET    /api/v1/profile/me/stats       Aggregated lifetime stats
POST   /api/v1/profile/me/avatar      Upload avatar (multipart)
POST   /api/v1/onboarding/complete    Mark onboarding done, set initial data

════════════════════════════════════════════════════════════════
  GOALS ENDPOINTS
════════════════════════════════════════════════════════════════
GET    /api/v1/goals                  List goals (filter: period, status)
POST   /api/v1/goals                  Create goal (+ milestones)
GET    /api/v1/goals/:id              Get single goal
PATCH  /api/v1/goals/:id              Update goal
DELETE /api/v1/goals/:id              Delete goal
PATCH  /api/v1/goals/:id/progress     Update progress value → triggers XP if completed
POST   /api/v1/goals/:id/complete     Mark goal as completed → awards XP
POST   /api/v1/goals/:id/milestones   Add milestone
PATCH  /api/v1/goals/:id/milestones/:mid  Complete milestone → XP

════════════════════════════════════════════════════════════════
  HABITS ENDPOINTS
════════════════════════════════════════════════════════════════
GET    /api/v1/habits                 List habits with weekly stats
POST   /api/v1/habits                 Create habit
GET    /api/v1/habits/:id             Get habit + 30-day log history
PATCH  /api/v1/habits/:id             Update habit settings
DELETE /api/v1/habits/:id             Archive habit (soft delete)
POST   /api/v1/habits/:id/log         Log habit for a date → XP, streak update
DELETE /api/v1/habits/:id/log/:date   Undo habit log for a date
GET    /api/v1/habits/:id/stats       Completion rates, streak history

════════════════════════════════════════════════════════════════
  QUESTS ENDPOINTS
════════════════════════════════════════════════════════════════
GET    /api/v1/quests/daily           Get today's quests (generates if empty)
POST   /api/v1/quests/:id/complete    Complete a quest → XP, achievement check
GET    /api/v1/quests/history         Past quests (paginated, filterable)

════════════════════════════════════════════════════════════════
  XP ENDPOINTS
════════════════════════════════════════════════════════════════
GET    /api/v1/xp/transactions        XP ledger (paginated)
GET    /api/v1/xp/summary             XP summary (today, week, month, alltime)
GET    /api/v1/xp/level-map           All level thresholds

════════════════════════════════════════════════════════════════
  ACHIEVEMENTS ENDPOINTS
════════════════════════════════════════════════════════════════
GET    /api/v1/achievements           All achievements with unlock status
GET    /api/v1/achievements/unlocked  User's unlocked achievements only
GET    /api/v1/achievements/:id       Single achievement detail

════════════════════════════════════════════════════════════════
  ANALYTICS ENDPOINTS
════════════════════════════════════════════════════════════════
GET    /api/v1/analytics/scores/today   Live score computation (real-time)
GET    /api/v1/analytics/scores/history?period=week|month|year
GET    /api/v1/analytics/radar          All 7 scores for radar chart
GET    /api/v1/analytics/trends         XP/score trends over time

════════════════════════════════════════════════════════════════
  REPORTS ENDPOINTS
════════════════════════════════════════════════════════════════
GET    /api/v1/reports/daily            Latest daily report
GET    /api/v1/reports/weekly           Latest weekly report
GET    /api/v1/reports/monthly          Latest monthly report
GET    /api/v1/reports/yearly           Latest yearly report
POST   /api/v1/reports/generate         Trigger report generation (idempotent)
GET    /api/v1/reports/history          All past reports (paginated)

════════════════════════════════════════════════════════════════
  COMMUNITY ENDPOINTS
════════════════════════════════════════════════════════════════
GET    /api/v1/friends                    List friends (accepted)
GET    /api/v1/friends/requests           Pending incoming requests
POST   /api/v1/friends/request            Send friend request { addresseeId }
POST   /api/v1/friends/accept/:id         Accept friend request
POST   /api/v1/friends/decline/:id        Decline / block
DELETE /api/v1/friends/:id                Remove friend

GET    /api/v1/leaderboard?period=weekly|monthly|yearly
GET    /api/v1/leaderboard/friends        Friends-only leaderboard

GET    /api/v1/feed                       Activity feed (friends + self)
GET    /api/v1/feed/global                Public global feed

GET    /api/v1/groups                     List public groups + joined groups
POST   /api/v1/groups                     Create group
GET    /api/v1/groups/:id                 Group detail + members
PATCH  /api/v1/groups/:id                 Update group (owner only)
DELETE /api/v1/groups/:id                 Delete group (owner only)
POST   /api/v1/groups/:id/join            Join public group
POST   /api/v1/groups/:id/leave           Leave group
DELETE /api/v1/groups/:id/members/:uid    Kick member (owner/admin)

GET    /api/v1/challenges                 Browse open challenges
POST   /api/v1/challenges                 Create challenge
GET    /api/v1/challenges/:id             Challenge detail + leaderboard
POST   /api/v1/challenges/:id/join        Join challenge
PATCH  /api/v1/challenges/:id/progress    Update own progress
GET    /api/v1/challenges/:id/leaderboard Participants ranked

════════════════════════════════════════════════════════════════
  NOTIFICATIONS ENDPOINTS
════════════════════════════════════════════════════════════════
GET    /api/v1/notifications              Paginated notifications
PATCH  /api/v1/notifications/:id/read     Mark single as read
POST   /api/v1/notifications/read-all     Mark all as read
DELETE /api/v1/notifications/:id          Delete notification
GET    /api/v1/notifications/unread-count Unread badge count

════════════════════════════════════════════════════════════════
  AI INSIGHTS ENDPOINTS
════════════════════════════════════════════════════════════════
GET    /api/v1/insights                   Active insights for user
POST   /api/v1/insights/:id/dismiss       Dismiss an insight
POST   /api/v1/insights/refresh           Regenerate insights

════════════════════════════════════════════════════════════════
  ADMIN / INTERNAL ENDPOINTS  (service_role only)
════════════════════════════════════════════════════════════════
POST   /api/internal/cron/daily-quests    Generate quests for all active users
POST   /api/internal/cron/analytics      Compute + snapshot daily scores
POST   /api/internal/cron/leaderboard    Rebuild leaderboard snapshots
POST   /api/internal/cron/reports        Generate period reports
POST   /api/internal/cron/streaks        Recalculate streaks + break penalties
POST   /api/internal/achievements/check  Check achievement triggers for a user
*/

// ============================================================
// BACKEND FOLDER STRUCTURE
// ============================================================
/*
solo-leveling-backend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── callback/route.ts
│   │   │   │   │   ├── refresh/route.ts
│   │   │   │   │   └── signout/route.ts
│   │   │   │   ├── profile/
│   │   │   │   │   ├── me/route.ts
│   │   │   │   │   ├── me/stats/route.ts
│   │   │   │   │   ├── me/avatar/route.ts
│   │   │   │   │   └── [username]/route.ts
│   │   │   │   ├── goals/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts
│   │   │   │   │       ├── progress/route.ts
│   │   │   │   │       ├── complete/route.ts
│   │   │   │   │       └── milestones/
│   │   │   │   │           ├── route.ts
│   │   │   │   │           └── [mid]/route.ts
│   │   │   │   ├── habits/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts
│   │   │   │   │       ├── log/route.ts
│   │   │   │   │       ├── log/[date]/route.ts
│   │   │   │   │       └── stats/route.ts
│   │   │   │   ├── quests/
│   │   │   │   │   ├── daily/route.ts
│   │   │   │   │   ├── history/route.ts
│   │   │   │   │   └── [id]/complete/route.ts
│   │   │   │   ├── xp/
│   │   │   │   │   ├── transactions/route.ts
│   │   │   │   │   ├── summary/route.ts
│   │   │   │   │   └── level-map/route.ts
│   │   │   │   ├── achievements/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── unlocked/route.ts
│   │   │   │   │   └── [id]/route.ts
│   │   │   │   ├── analytics/
│   │   │   │   │   ├── scores/today/route.ts
│   │   │   │   │   ├── scores/history/route.ts
│   │   │   │   │   ├── radar/route.ts
│   │   │   │   │   └── trends/route.ts
│   │   │   │   ├── reports/
│   │   │   │   │   ├── [period]/route.ts
│   │   │   │   │   ├── generate/route.ts
│   │   │   │   │   └── history/route.ts
│   │   │   │   ├── friends/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── requests/route.ts
│   │   │   │   │   ├── request/route.ts
│   │   │   │   │   ├── accept/[id]/route.ts
│   │   │   │   │   ├── decline/[id]/route.ts
│   │   │   │   │   └── [id]/route.ts
│   │   │   │   ├── leaderboard/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── friends/route.ts
│   │   │   │   ├── feed/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── global/route.ts
│   │   │   │   ├── groups/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts
│   │   │   │   │       ├── join/route.ts
│   │   │   │   │       ├── leave/route.ts
│   │   │   │   │       └── members/[uid]/route.ts
│   │   │   │   ├── challenges/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts
│   │   │   │   │       ├── join/route.ts
│   │   │   │   │       ├── progress/route.ts
│   │   │   │   │       └── leaderboard/route.ts
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── read-all/route.ts
│   │   │   │   │   ├── unread-count/route.ts
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts
│   │   │   │   │       └── read/route.ts
│   │   │   │   └── insights/
│   │   │   │       ├── route.ts
│   │   │   │       ├── refresh/route.ts
│   │   │   │       └── [id]/dismiss/route.ts
│   │   │   └── internal/
│   │   │       ├── cron/
│   │   │       │   ├── daily-quests/route.ts
│   │   │       │   ├── analytics/route.ts
│   │   │       │   ├── leaderboard/route.ts
│   │   │       │   ├── reports/route.ts
│   │   │       │   └── streaks/route.ts
│   │   │       └── achievements/check/route.ts
│   │   └── layout.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── server.ts             # Server-side client (cookies)
│   │   │   ├── admin.ts              # Service-role client
│   │   │   └── middleware.ts         # Auth middleware for App Router
│   │   ├── db/
│   │   │   └── queries.ts            # Raw SQL helpers via pg or Supabase
│   │   ├── auth/
│   │   │   └── session.ts            # getServerSession helper
│   │   ├── cache/
│   │   │   ├── redis.ts              # Upstash Redis client
│   │   │   └── keys.ts               # Cache key constants
│   │   ├── queue/
│   │   │   ├── client.ts             # BullMQ or Inngest client
│   │   │   └── jobs.ts               # Job definitions
│   │   ├── events/
│   │   │   ├── emitter.ts            # Internal EventEmitter
│   │   │   └── handlers.ts           # Achievement, notification handlers
│   │   ├── notifications/
│   │   │   ├── push.ts               # Web Push / FCM
│   │   │   └── email.ts              # Resend email client
│   │   ├── ai/
│   │   │   └── insights.ts           # OpenAI/Claude insight generation
│   │   └── utils/
│   │       ├── pagination.ts
│   │       ├── validation.ts
│   │       └── response.ts
│   │
│   ├── services/                     # Business logic layer
│   │   ├── AuthService.ts
│   │   ├── ProfileService.ts
│   │   ├── GoalService.ts
│   │   ├── HabitService.ts
│   │   ├── QuestService.ts
│   │   ├── XpService.ts
│   │   ├── AchievementService.ts
│   │   ├── AnalyticsService.ts
│   │   ├── ReportService.ts
│   │   ├── CommunityService.ts
│   │   ├── NotificationService.ts
│   │   ├── InsightService.ts
│   │   └── LeaderboardService.ts
│   │
│   ├── repositories/                 # Data access layer
│   │   ├── ProfileRepository.ts
│   │   ├── GoalRepository.ts
│   │   ├── HabitRepository.ts
│   │   ├── QuestRepository.ts
│   │   ├── XpRepository.ts
│   │   ├── AchievementRepository.ts
│   │   ├── AnalyticsRepository.ts
│   │   ├── CommunityRepository.ts
│   │   └── NotificationRepository.ts
│   │
│   ├── schemas/                      # Zod validation schemas
│   │   ├── goal.schema.ts
│   │   ├── habit.schema.ts
│   │   ├── profile.schema.ts
│   │   ├── community.schema.ts
│   │   └── quest.schema.ts
│   │
│   ├── types/
│   │   └── index.ts                  # Re-export of all TS interfaces
│   │
│   └── middleware.ts                 # Next.js edge middleware (auth guard)
│
├── supabase/
│   ├── migrations/
│   │   ├── 0001_extensions.sql
│   │   ├── 0002_enums.sql
│   │   ├── 0003_tables.sql
│   │   ├── 0004_indexes.sql
│   │   ├── 0005_rls.sql
│   │   ├── 0006_functions.sql
│   │   ├── 0007_triggers.sql
│   │   └── 0008_seed.sql
│   ├── seed.sql
│   └── config.toml
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── analytics/
│   ├── integration/
│   │   └── api/
│   └── e2e/
│
├── scripts/
│   ├── seed-levels.ts
│   ├── seed-achievements.ts
│   └── seed-quests.ts
│
├── .env.local                        # Local env vars
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
*/

// ============================================================
// SERVICE ARCHITECTURE EXAMPLES
// ============================================================

// src/services/XpService.ts
import { createClient } from '@/lib/supabase/admin'
import type { AwardXpResult } from '@/types'
import { EventEmitter } from '@/lib/events/emitter'

export class XpService {
  private supabase = createClient()
  private events = EventEmitter.getInstance()

  async awardXp(
    userId: string,
    amount: number,
    sourceType: string,
    sourceId: string | null,
    description: string
  ): Promise<AwardXpResult> {
    const { data, error } = await this.supabase
      .rpc('award_xp', {
        p_user_id: userId,
        p_amount: amount,
        p_source_type: sourceType,
        p_source_id: sourceId,
        p_description: description
      })
      .single()

    if (error) throw error

    const result: AwardXpResult = {
      newXp: data.new_xp,
      newLevel: data.new_level,
      leveledUp: data.leveled_up,
      newRank: data.new_rank
    }

    if (result.leveledUp) {
      this.events.emit('LEVEL_UP', {
        userId,
        oldLevel: result.newLevel - 1,
        newLevel: result.newLevel,
        newRank: result.newRank,
        timestamp: new Date().toISOString()
      })
    }

    return result
  }
}

// src/services/QuestService.ts  (excerpt)
export class QuestService {
  private supabase = createClient()
  private xpService = new XpService()

  async getDailyQuests(userId: string): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0]

    // Check if quests already generated
    const { data: existing } = await this.supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_date', today)

    if (existing && existing.length > 0) return existing

    // Generate if empty
    await this.supabase.rpc('generate_daily_quests', {
      p_user_id: userId,
      p_date: today,
      p_count: 5
    })

    const { data: generated } = await this.supabase
      .from('daily_quests')
      .select('*, categories(*)')
      .eq('user_id', userId)
      .eq('quest_date', today)
      .order('created_at')

    return generated ?? []
  }

  async completeQuest(userId: string, questId: string): Promise<any> {
    const { data: quest, error } = await this.supabase
      .from('daily_quests')
      .select('*')
      .eq('id', questId)
      .eq('user_id', userId)
      .single()

    if (error || !quest) throw new Error('Quest not found')
    if (quest.completed) throw new Error('Quest already completed')
    if (new Date(quest.expires_at) < new Date()) throw new Error('Quest expired')

    // Mark complete
    await this.supabase
      .from('daily_quests')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', questId)

    // Update counter
    await this.supabase
      .from('profiles')
      .update({ quests_completed: this.supabase.rpc('increment', { inc: 1 }) as any })
      .eq('id', userId)

    // Award XP
    const xpResult = await this.xpService.awardXp(
      userId, quest.xp_reward, 'quest', quest.id,
      `Quest completed: ${quest.title}`
    )

    // Emit event for achievement engine
    EventEmitter.getInstance().emit('QUEST_COMPLETED', {
      userId, questId: quest.id,
      xpAwarded: quest.xp_reward,
      timestamp: new Date().toISOString()
    })

    return { quest, xpResult }
  }
}

// src/services/AchievementService.ts  (excerpt)
const ACHIEVEMENT_CHECKERS: Record<string, (userId: string, supabase: any) => Promise<boolean>> = {
  'first_quest': async (userId, sb) => {
    const { count } = await sb.from('daily_quests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('completed', true)
    return (count ?? 0) >= 1
  },
  'streak_7': async (userId, sb) => {
    const { data } = await sb.from('profiles').select('current_streak').eq('id', userId).single()
    return (data?.current_streak ?? 0) >= 7
  },
  'quest_100': async (userId, sb) => {
    const { count } = await sb.from('daily_quests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('completed', true)
    return (count ?? 0) >= 100
  },
}

export class AchievementService {
  private supabase = createClient()

  async checkAndUnlock(userId: string): Promise<string[]> {
    const { data: allAchievements } = await this.supabase
      .from('achievements')
      .select('*')

    const { data: unlocked } = await this.supabase
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', userId)

    const unlockedIds = new Set(unlocked?.map(u => u.achievement_id) ?? [])
    const newlyUnlocked: string[] = []

    for (const achievement of (allAchievements ?? [])) {
      if (unlockedIds.has(achievement.id)) continue
      const checker = ACHIEVEMENT_CHECKERS[achievement.slug]
      if (!checker) continue

      const qualified = await checker(userId, this.supabase)
      if (!qualified) continue

      await this.supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_id: achievement.id,
        xp_awarded: achievement.xp_bonus
      })

      if (achievement.xp_bonus > 0) {
        await new XpService().awardXp(
          userId, achievement.xp_bonus, 'achievement',
          achievement.id, `Achievement unlocked: ${achievement.title}`
        )
      }

      newlyUnlocked.push(achievement.id)
    }

    return newlyUnlocked
  }
}

// ============================================================
// EVENT SYSTEM — src/lib/events/emitter.ts
// ============================================================
import type { AppEvent } from '@/types'

type EventHandler<T> = (payload: T) => void | Promise<void>

export class EventEmitter {
  private static instance: EventEmitter
  private listeners = new Map<string, EventHandler<any>[]>()

  static getInstance(): EventEmitter {
    if (!EventEmitter.instance) EventEmitter.instance = new EventEmitter()
    return EventEmitter.instance
  }

  on<T extends AppEvent['type']>(
    event: T,
    handler: EventHandler<Extract<AppEvent, { type: T }>['payload']>
  ): void {
    if (!this.listeners.has(event)) this.listeners.set(event, [])
    this.listeners.get(event)!.push(handler as EventHandler<any>)
  }

  emit<T extends AppEvent['type']>(
    event: T,
    payload: Extract<AppEvent, { type: T }>['payload']
  ): void {
    const handlers = this.listeners.get(event) ?? []
    for (const handler of handlers) {
      Promise.resolve(handler(payload)).catch(console.error)
    }
  }
}

// Register handlers at app startup (src/lib/events/handlers.ts):
//
// emitter.on('QUEST_COMPLETED', async ({ userId }) => {
//   await AchievementService.checkAndUnlock(userId)
//   await AnalyticsService.invalidateCache(userId)
// })
//
// emitter.on('LEVEL_UP', async ({ userId, newLevel, newRank }) => {
//   await NotificationService.send(userId, {
//     type: 'achievement',
//     title: `Level ${newLevel} reached!`,
//     message: `You've reached ${newRank} rank. Keep climbing, Hunter.`
//   })
// })
//
// emitter.on('ACHIEVEMENT_UNLOCKED', async ({ userId, achievementSlug }) => {
//   await NotificationService.send(userId, {
//     type: 'achievement',
//     title: 'Achievement Unlocked!',
//     message: `You earned: ${achievementSlug}`
//   })
//   await ActivityFeedService.post(userId, 'achieved', achievementSlug, 'achievement')
// })

// ============================================================
// NOTIFICATION SYSTEM — src/services/NotificationService.ts
// ============================================================
export class NotificationService {
  private supabase = createClient()

  async send(
    userId: string,
    notification: {
      type: string
      title: string
      message: string
      data?: Record<string, unknown>
    }
  ): Promise<void> {
    // 1. Store in DB (realtime picks it up via Supabase subscriptions)
    await this.supabase.from('notifications').insert({
      user_id: userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data ?? {}
    })

    // 2. Send push notification if user has push enabled
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('push_notifications, email_notifications')
      .eq('id', userId)
      .single()

    if (profile?.push_notifications) {
      await this.sendPushNotification(userId, notification.title, notification.message)
    }
  }

  private async sendPushNotification(
    userId: string,
    title: string,
    body: string
  ): Promise<void> {
    // Integrate with web-push or FCM
    // Implementation depends on chosen push provider
  }

  async sendEmail(
    userId: string,
    template: string,
    data: Record<string, unknown>
  ): Promise<void> {
    // Resend email integration
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({ ... })
  }
}
