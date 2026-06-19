import { motion } from 'framer-motion';
import {
  Target,
  Flame,
  Calendar,
  Award,
  type LucideIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useProfile } from '@/hooks/useProfile';
import { useTodayScores, useScoreHistory, useAnalyticsTrends, useRadarData, useReport } from '@/hooks/useAnalytics';
import { Spinner } from '@/components/ui/spinner';
import { shortDate } from '@/lib/time';

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#12121a] border border-white/10 rounded-lg p-3 shadow-xl">
        <p className="text-sm text-gray-400 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const { data: profile } = useProfile();
  const { data: todayScores } = useTodayScores();
  const { data: weekScores } = useScoreHistory('week');
  const { data: monthlyTrends } = useAnalyticsTrends('month');
  const { data: radarData } = useRadarData();
  const { data: weeklyReport } = useReport('weekly');

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8 text-blue-400" />
      </div>
    );
  }

  const weeklyXp = (weekScores ?? []).map((s) => ({
    day: shortDate(s.scoreDate).slice(0, 6),
    xp: s.xpEarnedToday,
    quests: s.questsDone,
  }));

  const monthlyProgress = (monthlyTrends?.data ?? []).map((p) => ({
    month: shortDate(p.date).slice(0, 6),
    lifeScore: p.lifeScore,
    discipline: p.disciplineScore,
    growth: p.growthScore,
  }));

  const skillRadar = (radarData ?? []).map((r) => ({ subject: r.subject, A: r.score, fullMark: r.fullMark }));

  const categoryBreakdown = (weeklyReport?.xpByCategory ?? []).map((c, i) => ({
    name: c.category,
    value: c.xp,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Deep insights into your leveling journey</p>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { label: 'Total XP Earned', value: profile.totalXpEarned.toLocaleString(), icon: Target, color: '#3b82f6', change: '' },
          { label: 'Quests Completed', value: profile.questsCompleted.toLocaleString(), icon: Award, color: '#8b5cf6', change: '' },
          { label: 'Current Streak', value: `${profile.currentStreak} days`, icon: Flame, color: '#f59e0b', change: profile.maxStreak === profile.currentStreak ? 'Personal best' : `Best: ${profile.maxStreak}` },
          {
            label: 'Today\'s Quests',
            value: todayScores ? `${todayScores.questsDone}/${todayScores.questsTotal}` : '—',
            icon: Calendar,
            color: '#10b981',
            change: '',
          },
        ] as { label: string; value: string; icon: LucideIcon; color: string; change: string }[]).map((stat) => (
          <motion.div
            key={stat.label}
            className="glass-card rounded-2xl p-5 glass-card-hover"
            whileHover={{ y: -2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <span className="text-xs text-gray-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            {stat.change && <p className="text-xs text-green-400 mt-1">{stat.change}</p>}
          </motion.div>
        ))}
      </motion.div>

      {/* Weekly XP Chart */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Weekly XP Gain</h3>
            <p className="text-sm text-gray-500">Experience points earned per day</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-gray-400">XP</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-gray-400">Quests</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyXp} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
            <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="xp" name="XP" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Monthly Progress + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-1">Monthly Progress</h3>
          <p className="text-sm text-gray-500 mb-6">Score trends over 6 months</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="lifeScore" name="Life" stroke="#ec4899" strokeWidth={2} dot={{ r: 4, fill: '#ec4899' }} />
              <Line type="monotone" dataKey="discipline" name="Discipline" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
              <Line type="monotone" dataKey="growth" name="Growth" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-1">Skill Radar</h3>
          <p className="text-sm text-gray-500 mb-6">Your abilities across dimensions</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={skillRadar} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#1a1a2e" />
              <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <PolarRadiusAxis stroke="#1a1a2e" fontSize={10} tickCount={5} domain={[0, 100]} />
              <Radar
                name="Skills"
                dataKey="A"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Category Breakdown + Weekly Review */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-1">Category Breakdown</h3>
          <p className="text-sm text-gray-500 mb-6">XP distribution by category</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={categoryBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-4">
            {categoryBreakdown.length === 0 && (
              <p className="text-xs text-gray-500">No category data yet this week.</p>
            )}
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-[10px] text-gray-400">{cat.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-1">Weekly Review</h3>
          <p className="text-sm text-gray-500 mb-6">Performance summary for this week</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {weeklyXp.length === 0 && (
              <p className="text-xs text-gray-500 col-span-full">No data for this week yet.</p>
            )}
            {(() => {
              const maxXp = Math.max(0, ...weeklyXp.map((d) => d.xp));
              return weeklyXp.map((day, i) => {
                const isBest = day.xp > 0 && day.xp === maxXp;
                return (
                  <motion.div
                    key={`${day.day}-${i}`}
                    className={`p-4 rounded-xl border ${
                      isBest
                        ? 'bg-blue-500/5 border-blue-500/20'
                        : 'bg-white/[0.02] border-white/5'
                    }`}
                    whileHover={{ y: -2 }}
                  >
                    <p className="text-xs text-gray-500 mb-2">{day.day}</p>
                    <p className="text-lg font-bold text-white">{day.xp > 0 ? `+${day.xp}` : day.xp}</p>
                    <p className="text-xs text-gray-600">{day.quests} quests</p>
                    {isBest && (
                      <div className="mt-2">
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                          Best day
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              });
            })()}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
