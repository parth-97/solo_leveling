import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { habitsApi } from '@/lib/api/habits';
import type { CreateHabitInput, UpdateHabitInput, LogHabitInput } from '@/types/shared';
import { useAuth } from '@/contexts/AuthContext';
import { profileKeys } from './useProfile';

export const habitsKeys = {
  all: ['habits'] as const,
  detail: (id: string) => ['habits', 'detail', id] as const,
  stats: (id: string) => ['habits', 'stats', id] as const,
};

export function useHabits() {
  const { session } = useAuth();
  return useQuery({
    queryKey: habitsKeys.all,
    queryFn: habitsApi.list,
    enabled: !!session,
    // Keep data fresh — refetch on window focus to catch midnight rollovers
    staleTime: 30_000,        // 30 seconds
    refetchOnWindowFocus: true,
  });
}

export function useHabit(id: string | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: habitsKeys.detail(id ?? ''),
    queryFn: () => habitsApi.get(id as string),
    enabled: !!session && !!id,
  });
}

export function useHabitStats(id: string | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: habitsKeys.stats(id ?? ''),
    queryFn: () => habitsApi.stats(id as string),
    enabled: !!session && !!id,
  });
}

export function useCreateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitInput) => habitsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
    },
  });
}

export function useUpdateHabit(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateHabitInput) => habitsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: habitsKeys.detail(id) });
    },
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => habitsApi.remove(id),

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: habitsKeys.all });
      const previousHabits = queryClient.getQueryData(habitsKeys.all);

      queryClient.setQueryData(habitsKeys.all, (old: any) =>
        Array.isArray(old) ? old.filter((habit: any) => habit.id !== id) : old
      );

      return { previousHabits };
    },

    onError: (_err, _id, context) => {
      if (context?.previousHabits) {
        queryClient.setQueryData(habitsKeys.all, context.previousHabits);
      }
    },

    onSettled: async () => {
      // Refetch habits list (already done optimistically, but sync with server).
      await queryClient.refetchQueries({ queryKey: habitsKeys.all });
      // FIX: use refetchQueries (not invalidateQueries) for profile so the
      // Dashboard XP bar / level updates immediately after the deduction,
      // rather than waiting for a lazy background refetch.
      await queryClient.refetchQueries({ queryKey: profileKeys.me });
      // FIX: invalidate the precise analytics today key so the Analytics page
      // re-fetches the freshly-recomputed snapshot (the server DELETE handler
      // now calls upsert_analytics_snapshot before returning).
      queryClient.invalidateQueries({ queryKey: ['analytics', 'scores', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'scores', 'history'] });
      queryClient.invalidateQueries({ queryKey: ['analytics', 'trends'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}

export function useLogHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: LogHabitInput }) =>
      habitsApi.log(id, input),

    onMutate: async ({ id, input }) => {
      // Cancel any in-flight refetches so they don't overwrite the optimistic update
      await queryClient.cancelQueries({ queryKey: habitsKeys.all });
      const previousHabits = queryClient.getQueryData(habitsKeys.all);
      const loggedDate = input?.loggedDate ?? new Date().toISOString().slice(0, 10);

      queryClient.setQueryData(habitsKeys.all, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((habit: any) => {
          if (habit.id !== id) return habit;

          // Remove any existing entry for this date (prevent double-counting)
          const existingHistory = (habit.completionHistory ?? []).filter(
            (l: any) => l.loggedDate !== loggedDate
          );

          return {
            ...habit,
            // Only increment weeklyCompleted for current week entries
            weeklyCompleted: isCurrentWeek(loggedDate)
              ? (habit.weeklyCompleted ?? 0) + 1
              : habit.weeklyCompleted,
            completionHistory: [
              ...existingHistory,
              { loggedDate, completed: true },
            ],
          };
        });
      });

      return { previousHabits };
    },

    onError: (_err, _vars, context) => {
      // Rollback optimistic update on error
      if (context?.previousHabits) {
        queryClient.setQueryData(habitsKeys.all, context.previousHabits);
      }
    },

    onSettled: async () => {
      // Always sync with server after mutation (success or failure)
      await queryClient.refetchQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}

export function useUndoHabitLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      habitsApi.undoLog(id, date),

    onMutate: async ({ id, date }) => {
      await queryClient.cancelQueries({ queryKey: habitsKeys.all });
      const previousHabits = queryClient.getQueryData(habitsKeys.all);

      queryClient.setQueryData(habitsKeys.all, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((habit: any) => {
          if (habit.id !== id) return habit;
          return {
            ...habit,
            weeklyCompleted: isCurrentWeek(date)
              ? Math.max(0, (habit.weeklyCompleted ?? 0) - 1)
              : habit.weeklyCompleted,
            completionHistory: (habit.completionHistory ?? []).filter(
              (log: any) => log.loggedDate !== date
            ),
          };
        });
      });

      return { previousHabits };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousHabits) {
        queryClient.setQueryData(habitsKeys.all, context.previousHabits);
      }
    },

    onSettled: async () => {
      await queryClient.refetchQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
    },
  });
}

export function useMarkHabitMissed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, missedDate, note }: { id: string; missedDate: string; note?: string }) =>
      habitsApi.markMissed(id, missedDate, note),

    onMutate: async ({ id, missedDate }) => {
      await queryClient.cancelQueries({ queryKey: habitsKeys.all });
      const previousHabits = queryClient.getQueryData(habitsKeys.all);

      queryClient.setQueryData(habitsKeys.all, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((habit: any) => {
          if (habit.id !== id) return habit;
          // Remove any existing entry for this date before adding missed marker
          const existingHistory = (habit.completionHistory ?? []).filter(
            (l: any) => l.loggedDate !== missedDate
          );
          return {
            ...habit,
            completionHistory: [
              ...existingHistory,
              { loggedDate: missedDate, completed: false },
            ],
          };
        });
      });

      return { previousHabits };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousHabits) {
        queryClient.setQueryData(habitsKeys.all, context.previousHabits);
      }
    },

    onSettled: async () => {
      await queryClient.refetchQueries({ queryKey: habitsKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Returns true if the given ISO date falls within the current Mon–Sun week. */
function isCurrentWeek(isoDate: string): boolean {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - daysFromMonday);
  const weekStart = monday.toISOString().slice(0, 10);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const weekEnd = sunday.toISOString().slice(0, 10);

  return isoDate >= weekStart && isoDate <= weekEnd;
}
