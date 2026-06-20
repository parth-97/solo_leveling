import { apiFetchData, apiFetch } from './client';
import type {
  GetTodayScoresResponse,
  GetScoreHistoryResponse,
  ScoreHistoryParams,
  GetRadarDataResponse,
  GetAnalyticsTrendsResponse,
  GetReportResponse,
  GenerateReportInput,
  GenerateReportResponse,
  ListReportsResponse,
} from '@/types/api';
import type { ReportPeriod, PaginationParams } from '@/types/shared';

export const analyticsApi = {
  /** GET /api/v1/analytics/scores/today */
  todayScores: () => apiFetchData<GetTodayScoresResponse['data']>('/analytics/scores/today'),

  /** GET /api/v1/analytics/scores/history?period= */
  scoreHistory: (params: ScoreHistoryParams) =>
    apiFetchData<GetScoreHistoryResponse['data']>('/analytics/scores/history', { params: params as unknown as Record<string, string> }),

  /** GET /api/v1/analytics/radar */
  radar: () => apiFetchData<GetRadarDataResponse['data']>('/analytics/radar'),

  /** GET /api/v1/analytics/trends?period= */
  trends: (params: ScoreHistoryParams) =>
    apiFetchData<GetAnalyticsTrendsResponse['data']>('/analytics/trends', { params: params as unknown as Record<string, string> }),
};

export const reportsApi = {
  /** GET /api/v1/reports/:period */
  get: (period: ReportPeriod) => apiFetchData<GetReportResponse['data']>(`/reports/${period}`),

  /** POST /api/v1/reports/generate */
  generate: (input: GenerateReportInput) =>
    apiFetchData<GenerateReportResponse['data']>('/reports/generate', { method: 'POST', body: input }),

  /** GET /api/v1/reports/history */
  history: (params?: PaginationParams) =>
    apiFetch<ListReportsResponse>('/reports/history', {
      params: params as Record<string, string | number | undefined>,
    }),
};
