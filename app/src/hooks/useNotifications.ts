import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi, insightsApi, categoriesApi } from '@/lib/api/notifications';
import type { ListNotificationsParams } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';

export const notificationsKeys = {
  list: (params?: ListNotificationsParams) => ['notifications', params ?? {}] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

export const insightsKeys = {
  all: ['insights'] as const,
};

export const categoriesKeys = {
  all: ['categories'] as const,
};

export function useNotifications(params?: ListNotificationsParams) {
  const { session } = useAuth();
  return useQuery({
    queryKey: notificationsKeys.list(params),
    queryFn: () => notificationsApi.list(params),
    enabled: !!session,
  });
}

export function useUnreadNotificationCount() {
  const { session } = useAuth();
  return useQuery({
    queryKey: notificationsKeys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    enabled: !!session,
    refetchInterval: 60 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// ── AI Insights ──────────────────────────────────────────────

export function useInsights() {
  const { session } = useAuth();
  return useQuery({ queryKey: insightsKeys.all, queryFn: insightsApi.list, enabled: !!session });
}

export function useDismissInsight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => insightsApi.dismiss(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: insightsKeys.all }),
  });
}

export function useRefreshInsights() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => insightsApi.refresh(),
    onSuccess: (data) => queryClient.setQueryData(insightsKeys.all, data),
  });
}

// ── Categories ───────────────────────────────────────────────

export function useCategories() {
  const { session } = useAuth();
  return useQuery({
    queryKey: categoriesKeys.all,
    queryFn: categoriesApi.list,
    enabled: !!session,
    staleTime: Infinity,
  });
}
