import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { questsApi, xpApi } from '@/lib/api/quests';
import type { QuestHistoryParams } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';
import { profileKeys } from './useProfile';

export const questsKeys = {
  daily: ['quests', 'daily'] as const,
  history: (params?: QuestHistoryParams) => ['quests', 'history', params ?? {}] as const,
};

export const xpKeys = {
  summary: ['xp', 'summary'] as const,
  levelMap: ['xp', 'level-map'] as const,
  transactions: ['xp', 'transactions'] as const,
};

/** Fetches today's daily quests for the current user. */
export function useDailyQuests() {
  const { session } = useAuth();
  return useQuery({
    queryKey: questsKeys.daily,
    queryFn: questsApi.daily,
    enabled: !!session,
  });
}

export function useQuestHistory(params?: QuestHistoryParams) {
  const { session } = useAuth();
  return useQuery({
    queryKey: questsKeys.history(params),
    queryFn: () => questsApi.history(params),
    enabled: !!session,
  });
}

/** Marks a daily quest complete. Awards XP, may level up / unlock achievements. */
export function useCompleteQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => questsApi.complete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questsKeys.daily });
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
      queryClient.invalidateQueries({ queryKey: xpKeys.summary });
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}

/** Fetches today/week/month/all-time XP totals for the dashboard. */
export function useXpSummary() {
  const { session } = useAuth();
  return useQuery({
    queryKey: xpKeys.summary,
    queryFn: xpApi.summary,
    enabled: !!session,
  });
}

/** Fetches the level -> rank/title/threshold map (mostly static). */
export function useLevelMap() {
  const { session } = useAuth();
  return useQuery({
    queryKey: xpKeys.levelMap,
    queryFn: xpApi.levelMap,
    enabled: !!session,
    staleTime: Infinity,
  });
}
