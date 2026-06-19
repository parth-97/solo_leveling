import { apiFetch, apiFetchData } from './client';
import type {
  GetDailyQuestsResponse,
  CompleteQuestResponse,
  GetQuestHistoryResponse,
  QuestHistoryParams,
  ListXpTransactionsResponse,
  GetXpSummaryResponse,
  GetLevelMapResponse,
} from '@/types/api';
import type { PaginationParams } from '@/types/shared';

export const questsApi = {
  /** GET /api/v1/quests/daily */
  daily: () => apiFetchData<GetDailyQuestsResponse['data']>('/quests/daily'),

  /** POST /api/v1/quests/:id/complete */
  complete: (id: string) =>
    apiFetchData<CompleteQuestResponse['data']>(`/quests/${id}/complete`, { method: 'POST' }),

  /** GET /api/v1/quests/history */
  history: (params?: QuestHistoryParams) =>
    apiFetch<GetQuestHistoryResponse>('/quests/history', {
      params: params as Record<string, string | number | boolean | undefined>,
    }),
};

export const xpApi = {
  /** GET /api/v1/xp/transactions */
  transactions: (params?: PaginationParams) =>
    apiFetch<ListXpTransactionsResponse>('/xp/transactions', {
      params: params as Record<string, string | number | undefined>,
    }),

  /** GET /api/v1/xp/summary */
  summary: () => apiFetchData<GetXpSummaryResponse['data']>('/xp/summary'),

  /** GET /api/v1/xp/level-map */
  levelMap: () => apiFetchData<GetLevelMapResponse['data']>('/xp/level-map'),
};
