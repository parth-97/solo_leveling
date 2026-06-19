import { apiFetchData } from './client';
import type { CreateHabitInput, UpdateHabitInput, LogHabitInput } from '@/types/shared';
import type {
  ListHabitsResponse,
  CreateHabitResponse,
  GetHabitResponse,
  UpdateHabitResponse,
  DeleteHabitResponse,
  LogHabitResponse,
  UndoHabitLogResponse,
  GetHabitStatsResponse,
} from '@/types/api';

export const habitsApi = {
  /** GET /api/v1/habits */
  list: () => apiFetchData<ListHabitsResponse['data']>('/habits'),

  /** POST /api/v1/habits */
  create: (input: CreateHabitInput) =>
    apiFetchData<CreateHabitResponse['data']>('/habits', { method: 'POST', body: input }),

  /** GET /api/v1/habits/:id */
  get: (id: string) => apiFetchData<GetHabitResponse['data']>(`/habits/${id}`),

  /** PATCH /api/v1/habits/:id */
  update: (id: string, input: UpdateHabitInput) =>
    apiFetchData<UpdateHabitResponse['data']>(`/habits/${id}`, { method: 'PATCH', body: input }),

  /** DELETE /api/v1/habits/:id — permanently deletes the habit and deducts its earned XP */
  remove: (id: string) =>
    apiFetchData<DeleteHabitResponse['data']>(`/habits/${id}`, { method: 'DELETE' }),

  /** POST /api/v1/habits/:id/log */
  log: (id: string, input?: LogHabitInput) =>
    apiFetchData<LogHabitResponse['data']>(`/habits/${id}/log`, { method: 'POST', body: input ?? {} }),

  /** DELETE /api/v1/habits/:id/log/:date */
  undoLog: (id: string, date: string) =>
    apiFetchData<UndoHabitLogResponse['data']>(`/habits/${id}/log/${date}`, { method: 'DELETE' }),

  /** GET /api/v1/habits/:id/stats */
  stats: (id: string) => apiFetchData<GetHabitStatsResponse['data']>(`/habits/${id}/stats`),

  /** POST /api/v1/habits/:id/missed — mark a past day as missed, deducts XP */
  markMissed: (id: string, missedDate: string, note?: string) =>
    apiFetchData<{
      log: Record<string, unknown>;
      xpDeducted: number;
      newStreak: number;
      newXp: number;
      newLevel: number;
      leveledDown: boolean;
    }>(`/habits/${id}/missed`, { method: 'POST', body: { missedDate, note } }),
};
