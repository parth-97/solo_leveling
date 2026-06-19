import { motion } from 'framer-motion';
import {
  Flame,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Star,
  Shield,
  Sword,
  type LucideIcon,
} from 'lucide-react';
import { RANKS } from '@/lib/constants';
import { resolveIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useProfile, useProfileStats } from '@/hooks/useProfile';
import { useAchievements } from '@/hooks/useAchievements';
import { useScoreHistory } from '@/hooks/useAnalytics';
import { Spinner } from '@/components/ui/spinner';
import { shortDate } from '@/lib/time';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function Profile() {
  const { data: profile } = useProfile();
  const { data: stats } = useProfileStats();
  const { data: achievements } = useAchievements();
  const { data: yearScores } = useScoreHistory('year');

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8 text-blue-400" />
      </div>
    );
  }

  const rankInfo = RANKS[profile.rank];
  const unlockedAchievements = (achievements ?? []).filter((a) => a.unlocked);
  const xpHistory = (yearScores ?? []).map((s) => ({ date: shortDate(s.scoreDate), xp: s.xpEarnedToday }));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Profile Header */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-6 md:p-8 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[120px] opacity-15"
          style={{ backgroundColor: rankInfo.color }}
        />

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
          >
            <div
              className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden ring-2 p-0.5 bg-white/5 flex items-center justify-center"
              style={{ boxShadow: `0 0 0 2px ${rankInfo.color}50` }}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full rounded-xl object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-blue-400">{profile.displayName[0]?.toUpperCase()}</span>
              )}
            </div>
            <div
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: rankInfo.color, color: '#fff' }}
            >
              {profile.rank}
            </div>
          </motion.div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-white">{profile.displayName}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {rankInfo.label} Hunter • Level {profile.level}
            </p>
            {profile.bio && (
              <p className="text-xs text-gray-600 mt-1">{profile.bio}</p>
            )}

            <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-4">
              {([
                { label: 'Quests', value: stats?.questsCompleted ?? profile.questsCompleted, icon: Target },
                { label: 'Habits', value: stats?.habitsTracked ?? profile.habitsTracked, icon: Flame },
                { label: 'Achievements', value: stats?.achievementsCount ?? profile.achievementsCount, icon: Award },
              ] as { label: string; value: number; icon: LucideIcon }[]).map((stat) => (
                <div key={stat.label} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-1.5">
                  <stat.icon className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-white font-medium">{stat.value}</span>
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 md:w-48">
            {([
              { label: 'Power', value: Math.round((profile.lifeScore + profile.disciplineScore + profile.growthScore) / 3), icon: Sword, color: '#3b82f6' },
              { label: 'Discipline', value: profile.disciplineScore, icon: Target, color: '#f59e0b' },
              { label: 'Growth', value: profile.growthScore, icon: TrendingUp, color: '#8b5cf6' },
              { label: 'Life', value: profile.lifeScore, icon: Shield, color: '#ec4899' },
            ] as { label: string; value: number; icon: LucideIcon; color: string }[]).map((stat) => (
              <div key={stat.label} className="text-center p-2 rounded-lg bg-white/5">
                <stat.icon className="w-4 h-4 mx-auto mb-1" style={{ color: stat.color }} />
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-[10px] text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Rank Progress */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Rank Progression</h3>
        <div className="flex items-center justify-between">
          {Object.entries(RANKS).map(([rank, info], index) => {
            const isCurrent = rank === profile.rank;
            const isPast = Object.entries(RANKS).findIndex(([r]) => r === profile.rank) > index;

            return (
              <div key={rank} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <motion.div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border-2',
                      isCurrent && 'animate-pulse-glow',
                    )}
                    style={{
                      backgroundColor: isPast || isCurrent ? `${info.color}20` : '#1a1a2e',
                      borderColor: isCurrent ? info.color : isPast ? `${info.color}40` : '#1a1a2e',
                      color: isPast || isCurrent ? info.color : '#64748b',
                    }}
                  >
                    {rank}
                  </motion.div>
                  <span className={cn(
                    'text-[10px] mt-1.5',
                    isCurrent ? 'text-white font-medium' : 'text-gray-600'
                  )}>
                    {info.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] text-gray-600 mt-0.5">Lv.{profile.level}</span>
                  )}
                </div>
                {index < Object.entries(RANKS).length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 bg-gray-800 relative">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ backgroundColor: info.color }}
                      initial={{ width: 0 }}
                      animate={{ width: isPast ? '100%' : isCurrent ? '60%' : '0%' }}
                      transition={{ duration: 0.8, ease: 'easeOut' as const }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* XP History Chart */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
        <h3 className="text-lg font-semibold text-white mb-1">XP History</h3>
        <p className="text-sm text-gray-500 mb-6">Daily experience points earned over the past year</p>
        {xpHistory.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-12">No XP history yet.</p>
        ) : (
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={xpHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12121a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#fff',
              }}
            />
            <Line
              type="monotone"
              dataKey="xp"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: '#3b82f6' }}
              activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
        )}
      </motion.div>

      {/* Achievement Showcase */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Achievement Showcase</h3>
          <span className="text-xs text-gray-500">{unlockedAchievements.length} unlocked</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {unlockedAchievements.length === 0 && (
            <p className="col-span-full text-sm text-gray-500 text-center py-4">
              No achievements unlocked yet.
            </p>
          )}
          {unlockedAchievements.map((achievement, index) => {
            const rarityColors: Record<string, string> = {
              common: '#94a3b8',
              rare: '#3b82f6',
              epic: '#8b5cf6',
              legendary: '#f59e0b',
            };
            const color = rarityColors[achievement.rarity];
            const AchievementIcon = resolveIcon(achievement.iconName);

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="flex flex-col items-center text-center group cursor-pointer"
              >
                <motion.div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-2 transition-all"
                  style={{
                    backgroundColor: `${color}15`,
                    border: `1px solid ${color}30`,
                  }}
                  whileHover={{ scale: 1.1, boxShadow: `0 0 20px ${color}30` }}
                >
                  <AchievementIcon className="w-6 h-6" style={{ color }} />
                </motion.div>
                <p className="text-[10px] text-gray-400 group-hover:text-white transition-colors">{achievement.title}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Statistics Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { label: 'Total XP Earned', value: (stats?.totalXpEarned ?? profile.totalXpEarned).toLocaleString(), icon: Star, color: '#3b82f6' },
          { label: 'Longest Streak', value: `${stats?.maxStreak ?? profile.maxStreak} days`, icon: Flame, color: '#f59e0b' },
          { label: 'Quests Completed', value: (stats?.questsCompleted ?? profile.questsCompleted).toLocaleString(), icon: Target, color: '#8b5cf6' },
          { label: 'Goals Completed', value: (stats?.totalGoalsCompleted ?? 0).toLocaleString(), icon: Calendar, color: '#10b981' },
        ] as { label: string; value: string; icon: LucideIcon; color: string }[]).map((stat) => (
          <motion.div
            key={stat.label}
            className="glass-card rounded-2xl p-5 text-center glass-card-hover"
            whileHover={{ y: -2 }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: `${stat.color}15` }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <p className="text-xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
