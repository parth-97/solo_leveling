import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords,
  Star,
  CheckCircle2,
  Circle,
  Sparkles,
  TrendingUp,
  CalendarDays,
  Trophy,
  ChevronLeft,
  ChevronRight,
  History,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { difficultyToNumber } from '@/lib/adapters/quest';
import { shortDate } from '@/lib/time';
import type { QuestDifficulty } from '@/types/shared';
import {
  useDailyQuests,
  useCompleteQuest,
  useQuestHistory,
  useXpSummary,
} from '@/hooks/useQuests';
import { Spinner } from '@/components/ui/spinner';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const difficultyConfig: Record<QuestDifficulty, { color: string; label: string }> = {
  easy: { color: '#64748b', label: 'Easy' },
  normal: { color: '#06b6d4', label: 'Normal' },
  hard: { color: '#3b82f6', label: 'Hard' },
  elite: { color: '#8b5cf6', label: 'Elite' },
  legendary: { color: '#f59e0b', label: 'Legendary' },
};

function DifficultyBadge({ difficulty }: { difficulty: QuestDifficulty }) {
  const config = difficultyConfig[difficulty];
  const filled = difficultyToNumber(difficulty);
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn('w-3 h-3', i >= filled && 'opacity-20')}
            style={{ color: config.color, fill: i < filled ? config.color : 'none' }}
          />
        ))}
      </div>
      <span className="text-[10px] font-medium" style={{ color: config.color }}>
        {config.label}
      </span>
    </div>
  );
}

const historyFilters = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'incomplete', label: 'Incomplete' },
] as const;

type HistoryFilter = (typeof historyFilters)[number]['key'];

const HISTORY_PAGE_SIZE = 8;

export default function Quests() {
  const { data: questsRes, isLoading: questsLoading } = useDailyQuests();
  const { data: xpSummary } = useXpSummary();
  const completeQuest = useCompleteQuest();

  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [historyPage, setHistoryPage] = useState(1);

  const { data: historyRes, isLoading: historyLoading } = useQuestHistory({
    page: historyPage,
    limit: HISTORY_PAGE_SIZE,
    completed:
      historyFilter === 'all' ? undefined : historyFilter === 'completed' ? true : false,
  });

  const quests = questsRes ?? [];
  const completedQuests = quests.filter((q) => q.completed).length;
  const pendingXp = quests.filter((q) => !q.completed).reduce((sum, q) => sum + q.xpReward, 0);

  const history = historyRes?.data ?? [];
  const meta = historyRes?.meta;

  const handleSetFilter = (filter: HistoryFilter) => {
    setHistoryFilter(filter);
    setHistoryPage(1);
  };

  const handleCompleteQuest = (id: string, title: string) => {
    completeQuest.mutate(id, {
      onSuccess: (result) => {
        toast.success(`"${title}" complete! +${result.xpAwarded} XP`, {
          description: result.leveledUp
            ? `Level up! You're now Level ${result.newLevel} (Rank ${result.newRank})`
            : undefined,
        });
        result.achievementsUnlocked.forEach((ach) => {
          toast.success(`Achievement unlocked: ${ach.title}`, {
            description: ach.description,
          });
        });
      },
      onError: () => {
        toast.error(`Failed to complete "${title}". Please try again.`);
      },
    });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quest Board</h1>
          <p className="text-sm text-gray-500 mt-1">Daily trials assigned by the System</p>
        </div>
        <div className="flex items-center gap-3 bg-[#12121a] rounded-xl px-4 py-2 border border-white/5">
          <Swords className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-gray-400">{completedQuests}/{quests.length} done</span>
          {pendingXp > 0 && (
            <>
              <span className="text-xs text-gray-600">|</span>
              <span className="text-sm font-bold text-cyan-400">+{pendingXp} XP available</span>
            </>
          )}
        </div>
      </motion.div>

      {/* XP Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { label: 'Today', value: xpSummary?.today ?? 0, icon: Sparkles, color: '#06b6d4' },
          { label: 'This Week', value: xpSummary?.week ?? 0, icon: TrendingUp, color: '#10b981' },
          { label: 'This Month', value: xpSummary?.month ?? 0, icon: CalendarDays, color: '#8b5cf6' },
          { label: 'All Time', value: xpSummary?.allTime ?? 0, icon: Trophy, color: '#f59e0b' },
        ] as { label: string; value: number; icon: LucideIcon; color: string }[]).map((stat) => (
          <motion.div
            key={stat.label}
            className="glass-card rounded-2xl p-5 glass-card-hover"
            whileHover={{ y: -2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <span className="text-xs text-gray-500">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{stat.value.toLocaleString()} XP</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Today's Quests */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Today's Quests</h3>
          <span className="text-xs text-gray-500">{completedQuests}/{quests.length} completed</span>
        </div>

        {questsLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-7 h-7 text-blue-400" />
          </div>
        )}

        {!questsLoading && quests.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-12">
            No quests for today yet. Check back after midnight.
          </p>
        )}

        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {quests.map((quest) => {
              const isPending = completeQuest.isPending && completeQuest.variables === quest.id;
              return (
                <motion.div
                  key={quest.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl transition-all',
                    quest.completed
                      ? 'bg-green-500/5 border border-green-500/10 cursor-default'
                      : 'bg-white/[0.02] border border-white/5 hover:border-white/10 cursor-pointer'
                  )}
                  onClick={() => !quest.completed && !isPending && handleCompleteQuest(quest.id, quest.title)}
                  whileHover={!quest.completed ? { x: 4 } : {}}
                  whileTap={!quest.completed ? { scale: 0.98 } : {}}
                >
                  <motion.div
                    initial={false}
                    animate={quest.completed ? { scale: [1, 1.2, 1] } : {}}
                  >
                    {isPending ? (
                      <Spinner className="w-5 h-5 text-blue-400" />
                    ) : quest.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-600" />
                    )}
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium', quest.completed ? 'text-gray-500 line-through' : 'text-white')}>
                      {quest.title}
                    </p>
                    {quest.description && (
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{quest.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-gray-600">{quest.category?.name ?? 'General'}</span>
                      <DifficultyBadge difficulty={quest.difficulty} />
                      {quest.isBonus && (
                        <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          BONUS
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-xs font-medium text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded-full shrink-0">
                    +{quest.xpReward} XP
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Quest History */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-white">Quest History</h3>
          </div>
          <div className="flex gap-2">
            {historyFilters.map((f) => (
              <motion.button
                key={f.key}
                onClick={() => handleSetFilter(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  historyFilter === f.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-[#0a0a0f] text-gray-400 border border-white/10 hover:text-white'
                )}
                whileTap={{ scale: 0.95 }}
              >
                {f.label}
              </motion.button>
            ))}
          </div>
        </div>

        {historyLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-7 h-7 text-blue-400" />
          </div>
        )}

        {!historyLoading && history.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-12">No quests match this filter yet.</p>
        )}

        <div className="space-y-2">
          {history.map((quest) => (
            <div
              key={quest.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5"
            >
              {quest.completed ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-gray-600 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm', quest.completed ? 'text-gray-300' : 'text-gray-500')}>
                  {quest.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-gray-600">{shortDate(quest.questDate)}</span>
                  <DifficultyBadge difficulty={quest.difficulty} />
                </div>
              </div>
              <span
                className={cn(
                  'text-xs font-medium px-2 py-1 rounded-full shrink-0',
                  quest.completed ? 'text-cyan-400 bg-cyan-400/10' : 'text-gray-600 bg-white/5'
                )}
              >
                +{quest.xpReward} XP
              </span>
            </div>
          ))}
        </div>

        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
            <span className="text-xs text-gray-500">
              Page {meta.page} of {Math.max(1, Math.ceil(meta.total / meta.limit))} · {meta.total} total
            </span>
            <div className="flex gap-2">
              <motion.button
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0a0a0f] text-gray-400 border border-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </motion.button>
              <motion.button
                onClick={() => setHistoryPage((p) => (meta.hasMore ? p + 1 : p))}
                disabled={!meta.hasMore}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0a0a0f] text-gray-400 border border-white/10 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                whileTap={{ scale: 0.95 }}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
