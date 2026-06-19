import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '@/lib/api/goals';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  UpdateGoalProgressInput,
} from '@/types/shared';
import type { ListGoalsParams, CreateMilestoneInput } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';
import { profileKeys } from './useProfile';

export const goalsKeys = {
  all: ['goals'] as const,
  list: (params?: ListGoalsParams) => ['goals', 'list', params ?? {}] as const,
  detail: (id: string) => ['goals', 'detail', id] as const,
};

/** Fetches the current user's goals, optionally filtered by period/status. */
export function useGoals(params?: ListGoalsParams) {
  const { session } = useAuth();
  return useQuery({
    queryKey: goalsKeys.list(params),
    queryFn: () => goalsApi.list(params),
    enabled: !!session,
  });
}

export function useGoal(id: string | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: goalsKeys.detail(id ?? ''),
    queryFn: () => goalsApi.get(id as string),
    enabled: !!session && !!id,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => goalsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
    },
  });
}

export function useUpdateGoal(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGoalInput) => goalsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
    },
  });
}

/** Updates progress on a goal. May award XP / level up. */
export function useUpdateGoalProgress(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGoalProgressInput) => goalsApi.updateProgress(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

/** Marks a goal complete. May award XP, level up, and unlock achievements. */
export function useCompleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useCreateMilestone(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneInput) => goalsApi.createMilestone(goalId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.detail(goalId) });
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
    },
  });
}

export function useCompleteMilestone(goalId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (milestoneId: string) => goalsApi.completeMilestone(goalId, milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalsKeys.detail(goalId) });
      queryClient.invalidateQueries({ queryKey: goalsKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
    },
  });
}
