import { z } from 'zod';

export const scoreHistoryQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year']),
});

export const reportPeriodSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);

export const generateReportSchema = z.object({
  period: reportPeriodSchema,
});
