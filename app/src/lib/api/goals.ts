import { apiFetch, apiFetchData } from './client';
import type { CreateGoalInput, UpdateGoalInput, UpdateGoalProgressInput } from '@/types/shared';
import type {
  ListGoalsParams,
  ListGoalsResponse,
  CreateGoalResponse,
  GetGoalResponse,
  UpdateGoalResponse,
  DeleteGoalResponse,
  UpdateGoalProgressResponse,
  CompleteGoalResponse,
  CreateMilestoneInput,
  CreateMilestoneResponse,
  CompleteMilestoneResponse,
} from '@/types/api';

export const goalsApi = {
  /** GET /api/v1/goals */
  list: (params?: ListGoalsParams) => apiFetch<ListGoalsResponse>('/goals', { params: params as Record<string, string | number | undefined> }),

  /** POST /api/v1/goals */
  create: (input: CreateGoalInput) =>
    apiFetchData<CreateGoalResponse['data']>('/goals', { method: 'POST', body: input }),

  /** GET /api/v1/goals/:id */
  get: (id: string) => apiFetchData<GetGoalResponse['data']>(`/goals/${id}`),

  /** PATCH /api/v1/goals/:id */
  update: (id: string, input: UpdateGoalInput) =>
    apiFetchData<UpdateGoalResponse['data']>(`/goals/${id}`, { method: 'PATCH', body: input }),

  /** DELETE /api/v1/goals/:id */
  remove: (id: string) =>
    apiFetchData<DeleteGoalResponse['data']>(`/goals/${id}`, { method: 'DELETE' }),

  /** PATCH /api/v1/goals/:id/progress */
  updateProgress: (id: string, input: UpdateGoalProgressInput) =>
    apiFetchData<UpdateGoalProgressResponse['data']>(`/goals/${id}/progress`, {
      method: 'PATCH',
      body: input,
    }),

  /** POST /api/v1/goals/:id/complete */
  complete: (id: string) =>
    apiFetchData<CompleteGoalResponse['data']>(`/goals/${id}/complete`, { method: 'POST' }),

  /** POST /api/v1/goals/:id/milestones */
  createMilestone: (goalId: string, input: CreateMilestoneInput) =>
    apiFetchData<CreateMilestoneResponse['data']>(`/goals/${goalId}/milestones`, {
      method: 'POST',
      body: input,
    }),

  /** PATCH /api/v1/goals/:id/milestones/:mid */
  completeMilestone: (goalId: string, milestoneId: string) =>
    apiFetchData<CompleteMilestoneResponse['data']>(`/goals/${goalId}/milestones/${milestoneId}`, {
      method: 'PATCH',
    }),
};
