import { apiFetch, apiFetchData } from './client';
import type {
  ListNotificationsParams,
  ListNotificationsResponse,
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
  DeleteNotificationResponse,
  GetUnreadCountResponse,
  ListInsightsResponse,
  DismissInsightResponse,
  RefreshInsightsResponse,
  ListCategoriesResponse,
} from '@/types/api';

export const notificationsApi = {
  /** GET /api/v1/notifications */
  list: (params?: ListNotificationsParams) =>
    apiFetch<ListNotificationsResponse>('/notifications', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),

  /** PATCH /api/v1/notifications/:id/read */
  markRead: (id: string) =>
    apiFetchData<MarkNotificationReadResponse['data']>(`/notifications/${id}/read`, { method: 'PATCH' }),

  /** POST /api/v1/notifications/read-all */
  markAllRead: () =>
    apiFetchData<MarkAllNotificationsReadResponse['data']>('/notifications/read-all', { method: 'POST' }),

  /** DELETE /api/v1/notifications/:id */
  remove: (id: string) =>
    apiFetchData<DeleteNotificationResponse['data']>(`/notifications/${id}`, { method: 'DELETE' }),

  /** GET /api/v1/notifications/unread-count */
  unreadCount: () => apiFetchData<GetUnreadCountResponse['data']>('/notifications/unread-count'),
};

export const insightsApi = {
  /** GET /api/v1/insights */
  list: () => apiFetchData<ListInsightsResponse['data']>('/insights'),

  /** POST /api/v1/insights/:id/dismiss */
  dismiss: (id: string) =>
    apiFetchData<DismissInsightResponse['data']>(`/insights/${id}/dismiss`, { method: 'POST' }),

  /** POST /api/v1/insights/refresh */
  refresh: () => apiFetchData<RefreshInsightsResponse['data']>('/insights/refresh', { method: 'POST' }),
};

export const categoriesApi = {
  /** GET /api/v1/categories */
  list: () => apiFetchData<ListCategoriesResponse['data']>('/categories'),
};
