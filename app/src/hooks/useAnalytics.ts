import { useQuery } from '@tanstack/react-query';
import { analyticsApi, reportsApi } from '@/lib/api/analytics';
import type { ScoreHistoryParams, GenerateReportInput } from '@/types/api';
import type { ReportPeriod } from '@/types/shared';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const analyticsKeys = {
  today: ['analytics', 'scores', 'today'] as const,
  history: (params: ScoreHistoryParams) => ['analytics', 'scores', 'history', params] as const,
  radar: ['analytics', 'radar'] as const,
  trends: (params: ScoreHistoryParams) => ['analytics', 'trends', params] as const,
};

export const reportsKeys = {
  byPeriod: (period: ReportPeriod) => ['reports', period] as const,
  history: ['reports', 'history'] as const,
};

/** Today's 7-axis analytics scores snapshot. */
export function useTodayScores() {
  const { session } = useAuth();
  return useQuery({
    queryKey: analyticsKeys.today,
    queryFn: analyticsApi.todayScores,
    enabled: !!session,
  });
}

/** Historical score snapshots for a period (week/month/year). */
export function useScoreHistory(period: ScoreHistoryParams['period']) {
  const { session } = useAuth();
  return useQuery({
    queryKey: analyticsKeys.history({ period }),
    queryFn: () => analyticsApi.scoreHistory({ period }),
    enabled: !!session,
  });
}

/** 7-axis radar chart data for the Analytics page. */
export function useRadarData() {
  const { session } = useAuth();
  return useQuery({
    queryKey: analyticsKeys.radar,
    queryFn: analyticsApi.radar,
    enabled: !!session,
  });
}

/** Trend series + averages for a period, used for Analytics charts. */
export function useAnalyticsTrends(period: ScoreHistoryParams['period']) {
  const { session } = useAuth();
  return useQuery({
    queryKey: analyticsKeys.trends({ period }),
    queryFn: () => analyticsApi.trends({ period }),
    enabled: !!session,
  });
}

/** Fetches the latest generated report for a period. */
export function useReport(period: ReportPeriod) {
  const { session } = useAuth();
  return useQuery({
    queryKey: reportsKeys.byPeriod(period),
    queryFn: () => reportsApi.get(period),
    enabled: !!session,
  });
}

/** Triggers regeneration of a report for a given period. */
export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateReportInput) => reportsApi.generate(input),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(reportsKeys.byPeriod(variables.period), data);
      queryClient.invalidateQueries({ queryKey: reportsKeys.history });
    },
  });
}
