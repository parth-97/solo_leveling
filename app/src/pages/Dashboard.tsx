import { motion } from 'framer-motion';
import {
  Heart,
  Target,
  TrendingUp,
  Flame,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  Trophy,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { RANKS } from '@/lib/constants';
import { resolveIcon } from '@/lib/icons';
import { completionArrayFromLogs } from '@/lib/adapters/quest';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useDailyQuests, useCompleteQuest } from '@/hooks/useQuests';
import { useHabits } from '@/hooks/useHabits';
import { useInsights } from '@/hooks/useNotifications';
import { useLeaderboard } from '@/hooks/useCommunity';
import { Spinner } from '@/components/ui/spinner';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export default function Dashboard() {
  const { data: profile } = useProfile();
  const { data: questsRes, isLoading: questsLoading } = useDailyQuests();
  const { data: habits } = useHabits();
  const { data: insights } = useInsights();
  const { data: leaderboard } = useLeaderboard({ period: 'weekly', limit: 5 });
  const completeQuest = useCompleteQuest();

  const quests = questsRes ?? [];

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8 text-blue-400" />
      </div>
    );
  }

  const rankInfo = RANKS[profile.rank];
  const nextRank = Object.entries(RANKS).find(([, v]) => v.minLevel > profile.level);

  const toggleQuest = (id: string, completed: boolean) => {
    if (completed) return; // quests can't be un-completed via the API
    completeQuest.mutate(id);
  };

  const completedQuests = quests.filter((q) => q.completed).length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Welcome + XP Summary */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, <span className="text-cyan-400 font-bold">{profile.displayName}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Day {profile.currentStreak} of your journey. Keep rising.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-[#12121a] rounded-xl px-4 py-2 border border-white/5">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span className="text-sm text-gray-400">Today:</span>
          <span className="text-sm font-bold text-cyan-400">{profile.xpEarnedToday > 0 ? `+${profile.xpEarnedToday}` : profile.xpEarnedToday} XP</span>
          <span className="text-xs text-gray-600">|</span>
          <span className="text-sm text-gray-400">{completedQuests}/{quests.length} quests</span>
        </div>
      </motion.div>

      {/* Rank Card */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#12121a] to-[#0a0a0f] border border-white/10 p-6 md:p-8"
      >
        {/* Background glow */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: rankInfo.color }}
        />
        
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          {/* Rank Badge */}
          <div className="flex-shrink-0">
            <motion.div
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl flex items-center justify-center relative"
              style={{
                background: `linear-gradient(135deg, ${rankInfo.color}20, ${rankInfo.color}10)`,
                border: `2px solid ${rankInfo.color}40`,
              }}
              animate={{ boxShadow: [`0 0 20px ${rankInfo.color}20`, `0 0 40px ${rankInfo.color}40`, `0 0 20px ${rankInfo.color}20`] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span
                className="text-5xl md:text-6xl font-black"
                style={{
                  color: 'transparent',
                  background: `linear-gradient(135deg, ${rankInfo.color}, white)`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                }}
              >
                {profile.rank}
              </span>
            </motion.div>
          </div>

          {/* Rank Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">Hunter Rank</span>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ backgroundColor: `${rankInfo.color}20`, color: rankInfo.color }}
              >
                {rankInfo.label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Level {profile.level}</h2>
            <p className="text-sm text-gray-400 mb-4">
              {nextRank
                ? `${nextRank[1].minLevel - profile.level} levels until ${nextRank[0]}-Rank`
                : 'Maximum rank achieved'}
            </p>

            {/* XP Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">XP Progress</span>
                <span className="text-gray-400">
                  {profile.xp.toLocaleString()} / {profile.xpToNextLevel.toLocaleString()}
                </span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${(profile.xp / profile.xpToNextLevel) * 100}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' as const }}
                >
                  <div className="absolute inset-0 shimmer" />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {([
              { label: 'Power', value: Math.round((profile.lifeScore + profile.disciplineScore + profile.growthScore) / 3), icon: Target, color: '#3b82f6' },
              { label: 'Discipline', value: profile.disciplineScore, icon: Flame, color: '#f59e0b' },
              { label: 'Growth', value: profile.growthScore, icon: TrendingUp, color: '#8b5cf6' },
              { label: 'Life', value: profile.lifeScore, icon: Heart, color: '#ec4899' },
            ] as { label: string; value: number; icon: LucideIcon; color: string }[]).map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <stat.icon className="w-3 h-3" style={{ color: stat.color }} />
                  <span className="text-[10px] text-gray-500 uppercase">{stat.label}</span>
                </div>
                <span className="text-lg font-bold text-white">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { label: 'Life Score', value: `${profile.lifeScore}/100`, icon: Heart, color: '#ec4899', trend: '' },
          { label: 'Discipline', value: `${profile.disciplineScore}/100`, icon: Target, color: '#3b82f6', trend: '' },
          { label: 'Growth', value: `${profile.growthScore}/100`, icon: TrendingUp, color: '#8b5cf6', trend: '' },
          { label: 'Streak', value: `${profile.currentStreak} Days`, icon: Flame, color: '#f59e0b', trend: '' },
        ] as { label: string; value: string; icon: LucideIcon; color: string; trend: string }[]).map((stat) => (
          <motion.div
            key={stat.label}
            className="glass-card rounded-2xl p-5 glass-card-hover cursor-pointer"
            whileHover={{ y: -2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <span className="text-xs text-gray-500">{stat.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              {stat.trend && <span className="text-xs text-green-400 font-medium">{stat.trend}</span>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Two Column: Quests + Habits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Quests */}
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-white">Daily Quests</h3>
            <span className="text-xs text-gray-500">
              {completedQuests}/{quests.length} completed
            </span>
          </div>

          {questsLoading && (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-5 h-5 text-blue-400" />
            </div>
          )}

          {!questsLoading && quests.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">No quests for today yet.</p>
          )}

          <div className="space-y-3">
            {quests.map((quest) => (
              <motion.div
                key={quest.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition-all',
                  quest.completed
                    ? 'bg-green-500/5 border border-green-500/10 cursor-default'
                    : 'bg-white/[0.02] border border-white/5 hover:border-white/10 cursor-pointer'
                )}
                onClick={() => toggleQuest(quest.id, quest.completed)}
                whileHover={!quest.completed ? { x: 4 } : {}}
                whileTap={!quest.completed ? { scale: 0.98 } : {}}
              >
                <motion.div
                  initial={false}
                  animate={quest.completed ? { scale: [1, 1.2, 1] } : {}}
                >
                  {quest.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-600" />
                  )}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-sm',
                    quest.completed ? 'text-gray-500 line-through' : 'text-white'
                  )}>
                    {quest.title}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{quest.category?.name ?? 'General'}</p>
                </div>
                <span className="text-xs font-medium text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full">
                  +{quest.xpReward} XP
                </span>
              </motion.div>
            ))}
          </div>

          <motion.button
            disabled
            title="Custom quests aren't supported by the API yet"
            className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/10 text-gray-600 cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Custom Quest</span>
          </motion.button>
        </motion.div>

        {/* Habit Tracker */}
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Habit Streaks</h3>
            </div>
            <span className="text-xs text-gray-500">Last 14 days</span>
          </div>

          <div className="space-y-4">
            {(habits ?? []).slice(0, 4).map((habit) => {
              const HabitIcon = resolveIcon(habit.iconName);
              const completion = completionArrayFromLogs(habit, 14);
              return (
                <div key={habit.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HabitIcon className="w-4 h-4" style={{ color: habit.color }} />
                      <span className="text-sm text-white">{habit.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-orange-400">{habit.currentStreak} day streak</span>
                      <span className="text-xs text-gray-600">
                        {habit.weeklyCompleted ?? 0}/{habit.weeklyTarget}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {completion.map((completed, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 h-6 rounded-md"
                        style={{
                          backgroundColor: completed ? habit.color : '#1a1a2e',
                          opacity: completed ? 1 : 0.3,
                        }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{ delay: i * 0.05, duration: 0.3 }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {(!habits || habits.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-8">No habits tracked yet.</p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between p-3 bg-orange-500/5 rounded-xl border border-orange-500/10">
            <div>
              <p className="text-sm font-bold text-orange-400">{profile.currentStreak} Day Streak</p>
              <p className="text-xs text-gray-500">Keep it up!</p>
            </div>
            <Trophy className="w-5 h-5 text-orange-400" />
          </div>
        </motion.div>
      </div>

      {/* AI Insights + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Insight */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">AI Insight</h3>
            </div>
            {insights && insights.length > 0 ? (
              <>
                <p className="text-sm text-gray-400 italic leading-relaxed mb-4">
                  "{insights[0].message}"
                </p>
                {insights[0].action && (
                  <motion.button
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    whileHover={{ x: 4 }}
                  >
                    {insights[0].action}
                    <ChevronRight className="w-3 h-3" />
                  </motion.button>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500 italic leading-relaxed">
                Keep completing quests and habits — insights will appear here as patterns emerge.
              </p>
            )}
          </div>
        </motion.div>

        {/* Leaderboard Preview */}
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Top Hunters</h3>
            </div>
          </div>

          <div className="space-y-3">
            {(leaderboard?.data ?? []).slice(0, 5).map((entry, index) => {
              const entryRankInfo = RANKS[entry.profile.rank];
              const isCurrentUser = entry.userId === profile.id;
              return (
                <motion.div
                  key={entry.userId}
                  className={cn(
                    'flex items-center gap-3 p-2 rounded-xl transition-colors',
                    isCurrentUser && 'bg-blue-500/5 border-l-2 border-blue-500'
                  )}
                  whileHover={{ x: 4 }}
                >
                  <span className={cn(
                    'text-sm font-bold w-5 text-center',
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-gray-300' :
                    index === 2 ? 'text-amber-600' : 'text-gray-600'
                  )}>
                    {index + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                    {entry.profile.avatarUrl ? (
                      <img
                        src={entry.profile.avatarUrl}
                        alt={entry.profile.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-blue-400">
                        {entry.profile.displayName[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm truncate', isCurrentUser ? 'text-blue-400' : 'text-white')}>
                      {entry.profile.displayName}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${entryRankInfo.color}20`, color: entryRankInfo.color }}
                  >
                    {entry.profile.rank}
                  </span>
                  <span className="text-xs text-gray-500">Lv.{entry.profile.level}</span>
                </motion.div>
              );
            })}
            {(!leaderboard || leaderboard.data.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">No leaderboard data yet.</p>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

