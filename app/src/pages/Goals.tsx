import { useState } from 'react';
import type { MouseEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Trophy,
  ChevronRight,
  Pencil,
  Trash2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useUpdateGoalProgress,
  useCompleteGoal,
  useCompleteMilestone,
} from '@/hooks/useGoals';
import { useCategories } from '@/hooks/useNotifications';
import { shortDate } from '@/lib/time';
import type { Goal, GoalPeriod } from '@/types/shared';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getServerToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns true if the goal's deadline has passed (server date). */
function isDeadlinePassed(goal: Goal): boolean {
  if (!goal.deadline) return false;
  return goal.deadline < getServerToday();
}

/** Returns true if deadline is within the next 3 days. */
function isDeadlineSoon(goal: Goal): boolean {
  if (!goal.deadline) return false;
  const today = getServerToday();
  const threeDaysOut = new Date();
  threeDaysOut.setUTCDate(threeDaysOut.getUTCDate() + 3);
  const cutoff = threeDaysOut.toISOString().slice(0, 10);
  return goal.deadline >= today && goal.deadline <= cutoff;
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

export default function Goals() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    categoryId: '',
    period: 'monthly' as GoalPeriod,
    deadline: '',
  });
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    categoryId: '',
    deadline: '',
    progress: 0,
    currentValue: 0,
  });
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // Show all statuses so failed goals appear too
  const { data: goalsRes, isLoading } = useGoals({ limit: 50 });
  const { data: categories } = useCategories();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal(editingGoal?.id ?? '');
  const updateGoalProgress = useUpdateGoalProgress(editingGoal?.id ?? '');
  const deleteGoal = useDeleteGoal();
  const completeGoal = useCompleteGoal();
  const completeMilestone = useCompleteMilestone(expandedGoal ?? '');

  const goals = goalsRes?.data ?? [];

  const filteredGoals = goals.filter((goal) => {
    const matchesSearch =
      goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (goal.description ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'All' || goal.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleMilestone = (milestoneId: string, completed: boolean) => {
    if (completed) return;
    completeMilestone.mutate(milestoneId);
  };

  const handleCreateGoal = () => {
    if (!newGoal.title.trim()) return;
    createGoal.mutate(
      {
        title: newGoal.title,
        description: newGoal.description || undefined,
        categoryId: newGoal.categoryId || undefined,
        period: newGoal.period,
        deadline: newGoal.deadline || undefined,
      },
      {
        onSuccess: () => {
          setNewGoal({ title: '', description: '', categoryId: '', period: 'monthly', deadline: '' });
          setShowCreateModal(false);
        },
      }
    );
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditForm({
      title: goal.title,
      description: goal.description ?? '',
      categoryId: goal.categoryId ?? '',
      deadline: goal.deadline ?? '',
      progress: goal.progress,
      currentValue: goal.currentValue ?? 0,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingGoal || !editForm.title.trim()) return;
    try {
      await updateGoal.mutateAsync({
        title: editForm.title,
        description: editForm.description || undefined,
        categoryId: editForm.categoryId || undefined,
        deadline: editForm.deadline || undefined,
      });

      if (
        editForm.progress !== editingGoal.progress ||
        editForm.currentValue !== (editingGoal.currentValue ?? 0)
      ) {
        const result = await updateGoalProgress.mutateAsync({
          progress: editForm.progress,
          currentValue: editingGoal.targetValue != null ? editForm.currentValue : undefined,
        });
        if (result.xpAwarded > 0) {
          toast.success(`"${editingGoal.title}" completed!`, {
            description: `+${result.xpAwarded} XP${result.leveledUp ? ' — Level up!' : ''}`,
          });
        }
      }
      setEditingGoal(null);
    } catch {
      toast.error('Failed to save changes. Please try again.');
    }
  };

  const handleCompleteGoal = (goal: Goal, e: MouseEvent) => {
    e.stopPropagation();

    // FIX: Guard against completing a past-deadline goal on the frontend too.
    // Backend enforces this, but we surface a clear message immediately.
    if (isDeadlinePassed(goal)) {
      toast.error('Deadline has passed', {
        description: `This goal's deadline (${shortDate(goal.deadline!)}) has passed. It will be marked as failed with a ${goal.xpReward * 2} XP penalty during the next midnight rollover.`,
      });
      return;
    }

    completeGoal.mutate(goal.id, {
      onSuccess: (result) => {
        if (result.xpAwarded > 0) {
          toast.success(`"${goal.title}" completed!`, {
            description: `+${result.xpAwarded} XP${result.leveledUp ? ' — Level up!' : ''}`,
          });
        }
      },
      onError: (err: any) => {
        const msg = err?.message ?? `Failed to complete "${goal.title}".`;
        // Show the backend message — it will mention deadline or failed status
        toast.error(msg.includes('deadline') || msg.includes('failed')
          ? 'Cannot complete goal'
          : 'Error',
          { description: msg }
        );
      },
    });
  };

  const handleConfirmDeleteGoal = () => {
    if (!goalToDelete) return;
    const title = goalToDelete.title;
    deleteGoal.mutate(goalToDelete.id, {
      onSuccess: () => {
        setGoalToDelete(null);
        toast.success(`"${title}" deleted`);
      },
      onError: () => toast.error(`Failed to delete "${title}". Please try again.`),
    });
  };

  const categoryNames = ['All', ...(categories ?? []).map((c) => c.name)];
  const categoryColors: Record<string, string> = {};
  (categories ?? []).forEach((cat) => {
    categoryColors[cat.name] = cat.color;
  });

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
          <h1 className="text-2xl font-bold text-white">Goals</h1>
          <p className="text-sm text-gray-500 mt-1">Track your epic quests and milestones</p>
        </div>
        <motion.button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          New Goal
        </motion.button>
      </motion.div>

      {/* Search & Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search goals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#12121a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categoryNames.map((cat) => (
            <motion.button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                selectedCategory === cat
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#12121a] text-gray-400 border border-white/10 hover:text-white'
              )}
              whileTap={{ scale: 0.95 }}
            >
              {cat}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Goals Grid */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner className="w-8 h-8 text-blue-400" />
        </div>
      )}

      {!isLoading && filteredGoals.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">
          No goals match your filters yet. Create one to get started.
        </div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGoals.map((goal) => {
          const isExpanded = expandedGoal === goal.id;
          const completedMilestones = goal.milestones.filter((m) => m.completed).length;
          const catColor = goal.category?.color ?? categoryColors[goal.category?.name ?? ''] ?? '#3b82f6';

          // FIX: deadline state classification
          const deadlinePassed = isDeadlinePassed(goal);
          const deadlineSoon = isDeadlineSoon(goal);
          const isFailed = goal.status === 'failed';
          const isCompleted = goal.status === 'completed';

          return (
            <motion.div
              key={goal.id}
              layout
              className={cn(
                'glass-card rounded-2xl p-5 glass-card-hover cursor-pointer',
                isFailed && 'opacity-70 border border-red-500/20',
                isCompleted && 'border border-green-500/20'
              )}
              onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {/* Status badges */}
                    {isFailed && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        <XCircle className="w-3 h-3" />
                        Failed — {goal.xpReward * 2} XP penalty
                      </span>
                    )}
                    {isCompleted && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    )}
                    {/* Deadline warning — only for active goals */}
                    {!isFailed && !isCompleted && deadlinePassed && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        Deadline passed!
                      </span>
                    )}
                    {!isFailed && !isCompleted && !deadlinePassed && deadlineSoon && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        Due soon
                      </span>
                    )}
                    {goal.category && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${catColor}20`, color: catColor }}
                      >
                        {goal.category.name}
                      </span>
                    )}
                    {goal.deadline && (
                      <span
                        className={cn(
                          'text-[10px] flex items-center gap-1',
                          deadlinePassed && !isFailed ? 'text-red-400' : 'text-gray-600'
                        )}
                      >
                        <Calendar className="w-3 h-3" />
                        {shortDate(goal.deadline)}
                      </span>
                    )}
                  </div>
                  <h3
                    className={cn(
                      'text-lg font-semibold',
                      isFailed ? 'text-gray-400 line-through' : 'text-white'
                    )}
                  >
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="text-sm text-gray-400 mt-1">{goal.description}</p>
                  )}
                </div>
                <div
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-lg',
                    isFailed ? 'bg-red-400/10' : 'bg-cyan-400/10'
                  )}
                >
                  <Trophy className={cn('w-3 h-3', isFailed ? 'text-red-400' : 'text-cyan-400')} />
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isFailed ? 'text-red-400' : 'text-cyan-400'
                    )}
                  >
                    {isFailed ? `-${goal.xpReward * 2}` : `+${goal.xpReward}`}
                  </span>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">
                    {goal.milestones.length > 0
                      ? `${completedMilestones}/${goal.milestones.length} milestones`
                      : isFailed
                      ? 'Failed'
                      : 'In progress'}
                  </span>
                  <span className="text-white font-medium">{goal.progress}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: isFailed
                        ? 'linear-gradient(90deg, #ef4444, #ef444480)'
                        : `linear-gradient(90deg, ${catColor}, ${catColor}80)`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${goal.progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' as const }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div
                className="flex items-center gap-2 pt-3 border-t border-white/5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Only show Edit for non-failed active goals */}
                {!isFailed && (
                  <motion.button
                    onClick={() => openEditModal(goal)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </motion.button>
                )}

                {/* Complete button: only for active goals where deadline hasn't passed */}
                {goal.status !== 'completed' && goal.status !== 'failed' && (
                  <motion.button
                    onClick={(e) => handleCompleteGoal(goal, e)}
                    disabled={completeGoal.isPending || deadlinePassed}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      deadlinePassed
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-green-400 hover:bg-green-500/10 disabled:opacity-50'
                    )}
                    whileTap={{ scale: 0.95 }}
                    title={deadlinePassed ? 'Deadline has passed — cannot complete' : 'Mark as complete'}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {deadlinePassed ? 'Expired' : 'Complete'}
                  </motion.button>
                )}

                <motion.button
                  onClick={() => setGoalToDelete(goal)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                  whileTap={{ scale: 0.95 }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </motion.button>
              </div>

              {/* Milestones */}
              <AnimatePresence>
                {isExpanded && goal.milestones.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      {goal.milestones.map((milestone) => (
                        <motion.div
                          key={milestone.id}
                          className={cn(
                            'flex items-center gap-3 p-2 rounded-lg hover:bg-white/5',
                            milestone.completed || isFailed
                              ? 'cursor-default'
                              : 'cursor-pointer'
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isFailed) toggleMilestone(milestone.id, milestone.completed);
                          }}
                          whileHover={!milestone.completed && !isFailed ? { x: 4 } : {}}
                        >
                          {milestone.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-600" />
                          )}
                          <span
                            className={cn(
                              'text-sm',
                              milestone.completed
                                ? 'text-gray-500 line-through'
                                : isFailed
                                ? 'text-gray-600'
                                : 'text-white'
                            )}
                          >
                            {milestone.title}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isExpanded && goal.milestones.length > 0 && (
                <div className="flex items-center text-xs text-gray-500 mt-2">
                  <ChevronRight className="w-3 h-3 mr-1" />
                  Click to view milestones
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Create Goal Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Goal Title</label>
              <Input
                value={newGoal.title}
                onChange={(e) => setNewGoal((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g., Run a Marathon"
                className="bg-[#0a0a0f] border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Description</label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal((p) => ({ ...p, description: e.target.value }))}
                placeholder="What do you want to achieve?"
                className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none h-20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Category</label>
                <select
                  value={newGoal.categoryId}
                  onChange={(e) => setNewGoal((p) => ({ ...p, categoryId: e.target.value }))}
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
                <label className="text-sm text-gray-400 mb-1 block">Period</label>
                <select
                  value={newGoal.period}
                  onChange={(e) =>
                    setNewGoal((p) => ({ ...p, period: e.target.value as GoalPeriod }))
                  }
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Deadline (optional)</label>
              <Input
                type="date"
                value={newGoal.deadline}
                onChange={(e) => setNewGoal((p) => ({ ...p, deadline: e.target.value }))}
                className="bg-[#0a0a0f] border-white/10 text-white"
                min={getServerToday()} // FIX: cannot set deadline in the past
              />
            </div>
            {createGoal.isError && (
              <p className="text-xs text-red-400">
                {createGoal.error instanceof Error
                  ? createGoal.error.message
                  : 'Failed to create goal.'}
              </p>
            )}
            <motion.button
              onClick={handleCreateGoal}
              disabled={createGoal.isPending}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              {createGoal.isPending ? 'Creating...' : 'Create Goal'}
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Modal */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Goal</DialogTitle>
          </DialogHeader>
          {editingGoal && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Goal Title</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  className="bg-[#0a0a0f] border-white/10 text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none h-20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Category</label>
                  <select
                    value={editForm.categoryId}
                    onChange={(e) => setEditForm((p) => ({ ...p, categoryId: e.target.value }))}
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
                  <label className="text-sm text-gray-400 mb-1 block">Deadline</label>
                  <Input
                    type="date"
                    value={editForm.deadline}
                    onChange={(e) => setEditForm((p) => ({ ...p, deadline: e.target.value }))}
                    className="bg-[#0a0a0f] border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <label className="text-gray-400">Progress</label>
                  <span className="text-white font-medium">{editForm.progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={editForm.progress}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, progress: Number(e.target.value) }))
                  }
                  className="w-full accent-blue-500"
                />
                {editingGoal.targetValue != null && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      value={editForm.currentValue}
                      onChange={(e) => {
                        const currentValue = Number(e.target.value);
                        const progress = Math.min(
                          100,
                          Math.round((currentValue / editingGoal.targetValue!) * 100)
                        );
                        setEditForm((p) => ({ ...p, currentValue, progress }));
                      }}
                      className="bg-[#0a0a0f] border-white/10 text-white"
                    />
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      / {editingGoal.targetValue} {editingGoal.unit}
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Reaching 100% completes the goal and awards its XP.
                </p>
              </div>

              {(updateGoal.isError || updateGoalProgress.isError) && (
                <p className="text-xs text-red-400">Failed to save changes. Please try again.</p>
              )}
              <motion.button
                onClick={handleSaveEdit}
                disabled={updateGoal.isPending || updateGoalProgress.isPending}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                whileTap={{ scale: 0.98 }}
              >
                {updateGoal.isPending || updateGoalProgress.isPending
                  ? 'Saving...'
                  : 'Save Changes'}
              </motion.button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Goal Confirmation Modal */}
      <Dialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Delete goal?</DialogTitle>
          </DialogHeader>
          {goalToDelete && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-gray-400">
                This permanently deletes{' '}
                <span className="text-white font-medium">{goalToDelete.title}</span> and its
                milestones. This can't be undone.
              </p>
              <div className="flex gap-3">
                <motion.button
                  onClick={() => setGoalToDelete(null)}
                  disabled={deleteGoal.isPending}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={handleConfirmDeleteGoal}
                  disabled={deleteGoal.isPending}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                  whileTap={{ scale: 0.98 }}
                >
                  {deleteGoal.isPending ? 'Deleting...' : 'Delete Goal'}
                </motion.button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
