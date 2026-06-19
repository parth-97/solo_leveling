import { apiFetchData } from './client';
import type {
  ListAchievementsResponse,
  ListUnlockedAchievementsResponse,
  GetAchievementResponse,
} from '@/types/api';

export const achievementsApi = {
  /** GET /api/v1/achievements */
  list: () => apiFetchData<ListAchievementsResponse['data']>('/achievements'),

  /** GET /api/v1/achievements/unlocked */
  unlocked: () => apiFetchData<ListUnlockedAchievementsResponse['data']>('/achievements/unlocked'),

  /** GET /api/v1/achievements/:id */
  get: (id: string) => apiFetchData<GetAchievementResponse['data']>(`/achievements/${id}`),
};
