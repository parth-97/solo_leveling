import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Plus,
  Calendar,
  TrendingUp,
  Award,
  Trash2,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { resolveIcon } from '@/lib/icons';
import {
  useHabits,
  useLogHabit,
  useUndoHabitLog,
  useCreateHabit,
  useDeleteHabit,
  useMarkHabitMissed,
} from '@/hooks/useHabits';
import { useProfile } from '@/hooks/useProfile';
import { useCategories } from '@/hooks/useNotifications';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const heatmapColors = [
  'bg-gray-800/50',
  'bg-blue-900/40',
  'bg-blue-800/50',
  'bg-blue-700/60',
  'bg-blue-500/80',
];

// ─────────────────────────────────────────────────────────────
// DATE HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Returns today's date in YYYY-MM-DD using the SERVER's notion of today.
 * We use UTC consistently across the app so the date never drifts based
 * on the user's system clock or timezone manipulation.
 */
function getServerToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns all 7 days of the current ISO week (Mon → Sun), UTC. */
function fullWeekDates(): string[] {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Returns 35 cells (5 weeks, Mon–Sun grid) for the activity heatmap.
 * FIXED: Now accepts habitCreatedDate so we never render cells before
 * a habit existed.
 */
function heatmapDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - daysFromMonday);
  const startDate = new Date(monday);
  startDate.setUTCDate(monday.getUTCDate() - 28);
  const cells: string[] = [];
  for (let i = 0; i < 35; i++) {
    const d = new Date(startDate);
    d.setUTCDate(startDate.getUTCDate() + i);
    cells.push(d.toISOString().slice(0, 10));
  }
  return cells;
}

function dayLabel(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function Habits() {
  const { data: habits, isLoading } = useHabits();
  const { data: profile } = useProfile();
  const { data: categories } = useCategories();
  const logHabit = useLogHabit();
  const undoHabitLog = useUndoHabitLog();
  const createHabit = useCreateHabit();
  const deleteHabit = useDeleteHabit();
  const markMissed = useMarkHabitMissed();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', categoryId: '', weeklyTarget: 7 });
  const [habitToDelete, setHabitToDelete] = useState<NonNullable<typeof habits>[number] | null>(null);

  // Pending map prevents duplicate mutations on the same (habit, date) pair
  const pendingRef = useRef<Set<string>>(new Set());

  // Use server UTC date, refreshed every minute so the UI auto-updates at midnight
  const [today, setToday] = useState<string>(getServerToday);
  useEffect(() => {
    const interval = setInterval(() => setToday(getServerToday()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Account start date from profile — used to gate "before you joined" display.
  // Falls back to today so no days appear before profile loads.
  const accountStartDate: string = profile?.createdAt
    ? profile.createdAt.slice(0, 10)
    : today;

  const days = fullWeekDates();

  // ─────────────────────────────────────────────────────────────
  // DATE CLASSIFICATION
  // These are UI-level classification helpers. The backend enforces
  // all restrictions independently — these just control what the UI shows.
  // ─────────────────────────────────────────────────────────────

  const isFuture = (date: string) => date > today;

  /** Before the user's account was created — should never be interactable */
  const isBeforeAccountJoin = (date: string) => date < accountStartDate;

  /**
   * FIX: A date is "before join" for a SPECIFIC HABIT if it's before that
   * habit's creation date. This is the key fix for the creation date bug.
   */
  const isBeforeHabitCreation = (
    habit: NonNullable<typeof habits>[number],
    date: string
  ): boolean => {
    if (!habit.createdAt) return false;
    const habitCreated = habit.createdAt.slice(0, 10);
    return date < habitCreated;
  };

  /**
   * A day is "day-locked" (immutable) if:
   *  1. It's a future date.
   *  2. It's before the habit was created.
   *  3. It's before the user joined.
   *
   * NOTE: Past days within the same day as midnight rollover processing
   * are also locked, but that's enforced by the backend. The frontend
   * shows "Day Locked" text when a backend rejection occurs.
   */
  const isDayLocked = (
    habit: NonNullable<typeof habits>[number],
    date: string
  ): boolean => {
    return isFuture(date) || isBeforeHabitCreation(habit, date) || isBeforeAccountJoin(date);
  };

  const isLoggedOn = (habit: NonNullable<typeof habits>[number], date: string) =>
    (habit.completionHistory ?? []).some(
      (l) => l.loggedDate === date && l.completed === true
    );

  const isMissedOn = (habit: NonNullable<typeof habits>[number], date: string) =>
    (habit.completionHistory ?? []).some(
      (l) => l.loggedDate === date && l.completed === false
    );

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────

  const toggleHabitDay = useCallback(
    (
      habitId: string,
      habit: NonNullable<typeof habits>[number],
      date: string,
      currentlyLogged: boolean
    ) => {
      if (isDayLocked(habit, date)) return;

      const key = `${habitId}:${date}`;
      if (pendingRef.current.has(key)) return; // debounce
      pendingRef.current.add(key);
      const release = () => pendingRef.current.delete(key);

      if (currentlyLogged) {
        undoHabitLog.mutate(
          { id: habitId, date },
          {
            onSettled: release,
            onError: (err: any) => {
              // If backend says "Day Locked", show that message prominently
              const msg = err?.message ?? 'Failed to undo';
              if (msg.toLowerCase().includes('locked')) {
                toast.error('Day Locked', {
                  description: 'This day has been locked and can no longer be modified.',
                });
              } else {
                toast.error(msg);
              }
            },
          }
        );
      } else {
        logHabit.mutate(
          { id: habitId, input: { loggedDate: date } },
          {
            onSettled: release,
            onError: (err: any) => {
              const msg = err?.message ?? 'Failed to log';
              if (msg.toLowerCase().includes('locked')) {
                toast.error('Day Locked', {
                  description: 'This day has been locked and can no longer be modified.',
                });
              } else if (msg.toLowerCase().includes('already')) {
                toast.error('Already logged', { description: msg });
              } else {
                toast.error(msg);
              }
            },
          }
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, accountStartDate, undoHabitLog, logHabit]
  );

  const handleMarkMissed = useCallback(
    (habitId: string, habit: NonNullable<typeof habits>[number], date: string) => {
      if (isDayLocked(habit, date)) return;
      if (date >= today) return;

      const key = `missed:${habitId}:${date}`;
      if (pendingRef.current.has(key)) return;
      pendingRef.current.add(key);
      const release = () => pendingRef.current.delete(key);

      markMissed.mutate(
        { id: habitId, missedDate: date },
        {
          onSuccess: (result) => {
            release();
            toast.error(`Missed: ${habit.name}`, {
              description: `-${result.xpDeducted} XP penalty · Now ${result.newXp} XP`,
            });
          },
          onError: (err: any) => {
            release();
            const msg = err?.message ?? 'Failed to mark as missed';
            if (msg.toLowerCase().includes('locked')) {
              toast.error('Day Locked', {
                description: 'This day has been locked and can no longer be modified.',
              });
            } else {
              toast.error(msg);
            }
          },
        }
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, accountStartDate, markMissed]
  );

  const handleCreateHabit = () => {
    if (!newHabit.name.trim()) return;
    createHabit.mutate(
      {
        name: newHabit.name,
        categoryId: newHabit.categoryId || undefined,
        weeklyTarget: newHabit.weeklyTarget,
      },
      {
        onSuccess: () => {
          setNewHabit({ name: '', categoryId: '', weeklyTarget: 7 });
          setShowCreateModal(false);
        },
      }
    );
  };

  const handleConfirmDelete = () => {
    if (!habitToDelete) return;
    const name = habitToDelete.name;
    deleteHabit.mutate(habitToDelete.id, {
      onSuccess: (result) => {
        setHabitToDelete(null);
        if (result.xpDeducted > 0) {
          toast.success(`"${name}" deleted`, {
            description: result.leveledDown
              ? `-${result.xpDeducted} XP — dropped to Level ${result.newLevel} (Rank ${result.newRank})`
              : `-${result.xpDeducted} XP deducted · now Level ${result.newLevel} (Rank ${result.newRank})`,
          });
        } else {
          toast.success(`"${name}" deleted`);
        }
      },
      onError: () => {
        toast.error(`Failed to delete "${name}". Please try again.`);
      },
    });
  };

  // ─────────────────────────────────────────────────────────────
  // DERIVED DATA
  // ─────────────────────────────────────────────────────────────

  const habitList = habits ?? [];
  const totalCompletions = habitList.reduce((sum, h) => sum + (h.totalCompletions ?? 0), 0);
  const bestHabit =
    habitList.length > 0
      ? habitList.reduce(
          (best, h) => (h.currentStreak > best.currentStreak ? h : best),
          habitList[0]
        )
      : null;

  const heatCells = heatmapDates();

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Habit Forge</h1>
          <p className="text-sm text-gray-500 mt-1">Build unbreakable habits, one day at a time</p>
        </div>
        <motion.button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          New Habit
        </motion.button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          {
            label: 'Best Streak',
            value: `${bestHabit?.currentStreak ?? 0} days`,
            icon: Flame,
            color: '#f59e0b',
            sub: `Best ever: ${bestHabit?.maxStreak ?? profile?.maxStreak ?? 0} days`,
          },
          {
            label: 'Total Completions',
            value: String(totalCompletions),
            icon: Calendar,
            color: '#3b82f6',
            sub: 'All time',
          },
          {
            label: 'Best Habit',
            value: bestHabit?.name ?? '—',
            icon: Award,
            color: '#8b5cf6',
            sub: bestHabit ? `${bestHabit.currentStreak} day streak` : 'No habits yet',
          },
          {
            label: 'Habits Tracked',
            value: String(habitList.length),
            icon: TrendingUp,
            color: '#10b981',
            sub: 'Active habits',
          },
        ] as { label: string; value: string; icon: LucideIcon; color: string; sub: string }[]).map((stat) => (
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
            <p className="text-xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-600 mt-1">{stat.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Habit Detail Cards */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner className="w-8 h-8 text-blue-400" />
        </div>
      )}

      {!isLoading && habitList.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">
          No habits yet. Create one to start tracking your streaks.
        </div>
      )}

      <div className="space-y-4">
        {habitList.map((habit) => {
          const HabitIcon = resolveIcon(habit.iconName);
          const weeklyCompleted = habit.weeklyCompleted ?? 0;
          const weeklyTarget = habit.weeklyTarget || 1;

          // FIX: Habit creation date — cells before this are locked for THIS habit
          const habitCreatedDate = habit.createdAt ? habit.createdAt.slice(0, 10) : accountStartDate;

          return (
            <motion.div
              key={habit.id}
              variants={itemVariants}
              className="glass-card rounded-2xl p-5 glass-card-hover"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Habit Info */}
                <div className="flex items-center gap-4 md:w-48 shrink-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${habit.color}15` }}
                  >
                    <HabitIcon className="w-6 h-6" style={{ color: habit.color }} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">{habit.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Flame className="w-3 h-3 text-orange-400" />
                      <span className="text-xs text-orange-400">{habit.currentStreak} days</span>
                    </div>
                  </div>
                </div>

                {/* Full 7-day week grid */}
                <div className="flex-1">
                  <div className="flex gap-2">
                    {days.map((date) => {
                      const completed = isLoggedOn(habit, date);
                      const missed = isMissedOn(habit, date);

                      // FIX: Lock checks use per-HABIT creation date
                      const future = isFuture(date);
                      const beforeHabitCreation = isBeforeHabitCreation(habit, date);
                      const beforeAccountJoin = isBeforeAccountJoin(date);
                      const locked = future || beforeHabitCreation || beforeAccountJoin;

                      const isToday = date === today;
                      // "miss" button only on past days that are not locked and not today.
                      // Explicitly exclude today with !isToday (belt-and-suspenders in case
                      // UTC midnight edge cases cause date === today to drift briefly).
                      const isPastAndAllowed = !locked && !isToday && date < today;
                      const alreadyLogged = completed || missed;

                      return (
                        <div key={date} className="flex-1 flex flex-col items-center gap-1">
                          {/* Day label */}
                          <span
                            className={cn(
                              'text-[10px]',
                              isToday ? 'text-blue-400 font-semibold' : 'text-gray-600'
                            )}
                          >
                            {dayLabel(date)}
                          </span>

                          {/* Day cell */}
                          <motion.button
                            className={cn(
                              'w-full aspect-square rounded-lg border transition-all flex items-center justify-center',
                              locked
                                ? 'cursor-not-allowed opacity-25 border-white/5 bg-white/[0.01]'
                                : missed
                                ? 'cursor-not-allowed border-red-500/60 bg-red-500/10'
                                : completed
                                ? 'cursor-pointer border-transparent'
                                : isToday
                                ? 'cursor-pointer border-blue-500/40 bg-blue-500/5'
                                : 'cursor-pointer border-white/10 bg-white/[0.02]'
                            )}
                            style={completed && !locked ? { backgroundColor: habit.color } : {}}
                            onClick={() =>
                              !locked && !missed && toggleHabitDay(habit.id, habit, date, completed)
                            }
                            disabled={locked || missed}
                            whileTap={!locked && !alreadyLogged ? { scale: 0.9 } : {}}
                            initial={false}
                            animate={completed && !locked ? { scale: [1, 1.1, 1] } : {}}
                            title={
                              future
                                ? 'Future — not available yet'
                                : beforeHabitCreation
                                ? `Before this habit was created (${habitCreatedDate})`
                                : beforeAccountJoin
                                ? 'Before you joined'
                                : missed
                                ? 'Missed — XP deducted'
                                : completed
                                ? 'Completed ✓ (click to undo)'
                                : isToday
                                ? 'Mark complete'
                                : 'Mark complete'
                            }
                          >
                            {locked ? (
                              <Lock className="w-3 h-3 text-white/20" />
                            ) : missed ? (
                              <span className="text-red-400 text-xs font-bold">✕</span>
                            ) : null}
                          </motion.button>

                          {/*
                            "miss" button: ONLY on past days within allowed range
                            (not locked, not already logged)
                          */}
                          {isPastAndAllowed && !alreadyLogged ? (
                            <motion.button
                              className="text-[9px] text-red-400/60 hover:text-red-400 transition-colors"
                              onClick={() => handleMarkMissed(habit.id, habit, date)}
                              whileTap={{ scale: 0.9 }}
                              title="Mark as missed — deducts XP"
                            >
                              miss
                            </motion.button>
                          ) : (
                            <span className="text-[9px] text-transparent select-none">·</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 md:w-48 shrink-0 justify-end">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">
                      {weeklyCompleted}/{habit.weeklyTarget}
                    </p>
                    <p className="text-[10px] text-gray-500">This week</p>
                  </div>
                  <div className="w-12 h-12 relative">
                    <svg className="w-12 h-12 -rotate-90">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="#1a1a2e" strokeWidth="4" />
                      <motion.circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke={habit.color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 20}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 20 }}
                        animate={{
                          strokeDashoffset:
                            2 * Math.PI * 20 * (1 - Math.min(weeklyCompleted / weeklyTarget, 1)),
                        }}
                        transition={{ duration: 1, ease: 'easeOut' as const }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                      {Math.round((weeklyCompleted / weeklyTarget) * 100)}%
                    </span>
                  </div>
                  <motion.button
                    onClick={() => setHabitToDelete(habit)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={`Delete ${habit.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Activity Heatmap */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">Activity Heatmap</h3>
          <span className="text-sm text-gray-400 px-2">Last 5 weeks</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} className="text-center text-[10px] text-gray-600 py-1">
              {d[0]}
            </div>
          ))}
          {heatCells.map((date) => {
            const future = isFuture(date);
            const beforeAccountJoin = isBeforeAccountJoin(date);

            // FIX: For the heatmap, a date only counts completions from habits
            // that existed on that date (habit.createdAt <= date).
            const eligibleHabits = habitList.filter(
              (h) => !h.createdAt || h.createdAt.slice(0, 10) <= date
            );

            const completions = eligibleHabits.filter((h) => isLoggedOn(h, date)).length;
            const total = eligibleHabits.length;

            // Don't show activity before account join or in the future
            const isInactive = future || beforeAccountJoin || total === 0;

            const ratio = total > 0 ? completions / total : 0;
            const intensity = completions === 0 ? 0 : Math.min(4, Math.ceil(ratio * 4));

            return (
              <motion.div
                key={date}
                className={cn(
                  'aspect-square rounded-md border border-white/5',
                  isInactive ? 'bg-white/[0.02] opacity-20' : heatmapColors[intensity]
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.2, zIndex: 10 }}
                title={
                  future
                    ? 'Future'
                    : beforeAccountJoin
                    ? 'Before you joined'
                    : total === 0
                    ? `${date}: No habits existed yet`
                    : `${date}: ${completions}/${total} completed`
                }
              />
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 mt-4">
          <span className="text-[10px] text-gray-600">Less</span>
          {heatmapColors.map((color, i) => (
            <div key={i} className={cn('w-3 h-3 rounded-sm', color)} />
          ))}
          <span className="text-[10px] text-gray-600">More</span>
        </div>
      </motion.div>

      {/* Create Habit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Habit Name</label>
              <Input
                value={newHabit.name}
                onChange={(e) => setNewHabit((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Morning Run"
                className="bg-[#0a0a0f] border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Category</label>
                <select
                  value={newHabit.categoryId}
                  onChange={(e) => setNewHabit((p) => ({ ...p, categoryId: e.target.value }))}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="">No category</option>
                  {(categories ?? []).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Weekly Target</label>
                <Input
                  type="number"
                  min={1}
                  max={7}
                  value={newHabit.weeklyTarget}
                  onChange={(e) =>
                    setNewHabit((p) => ({ ...p, weeklyTarget: Number(e.target.value) }))
                  }
                  className="bg-[#0a0a0f] border-white/10 text-white"
                />
              </div>
            </div>
            {createHabit.isError && (
              <p className="text-xs text-red-400">
                {createHabit.error instanceof Error
                  ? createHabit.error.message
                  : 'Failed to create habit.'}
              </p>
            )}
            <motion.button
              onClick={handleCreateHabit}
              disabled={createHabit.isPending}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              {createHabit.isPending ? 'Creating...' : 'Create Habit'}
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Habit Confirmation Modal */}
      <Dialog open={!!habitToDelete} onOpenChange={(open) => !open && setHabitToDelete(null)}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete habit?</DialogTitle>
          </DialogHeader>
          {habitToDelete && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-gray-400">
                This permanently deletes{' '}
                <span className="text-white font-medium">{habitToDelete.name}</span> and its full
                history. Any XP it earned will be deducted from your total, and your level and rank
                will be recalculated.
              </p>
              {habitToDelete.totalCompletions > 0 && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                  <p className="text-sm text-red-300">
                    ~{habitToDelete.totalCompletions * habitToDelete.xpPerCompletion} XP earned from
                    this habit will be removed.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <motion.button
                  onClick={() => setHabitToDelete(null)}
                  disabled={deleteHabit.isPending}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleConfirmDelete}
                  disabled={deleteHabit.isPending}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  whileTap={{ scale: 0.98 }}
                >
                  {deleteHabit.isPending ? 'Deleting...' : 'Delete Habit'}
                </motion.button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
