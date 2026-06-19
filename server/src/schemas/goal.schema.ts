import { z } from 'zod';

export const goalPeriodSchema = z.enum(['daily', 'weekly', 'monthly', 'yearly', 'custom']);
export const goalStatusSchema = z.enum(['active', 'completed', 'failed', 'paused']);

export const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid().optional(),
  period: goalPeriodSchema,
  targetValue: z.number().optional(),
  unit: z.string().max(32).optional(),
  xpReward: z.number().int().min(0).max(100000).optional(),
  deadline: z.string().optional(), // ISO date
  milestones: z
    .array(z.object({ title: z.string().min(1).max(200), xpReward: z.number().int().min(0).optional() }))
    .optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid().optional(),
  status: goalStatusSchema.optional(),
  progress: z.number().min(0).max(100).optional(),
  currentValue: z.number().optional(),
  deadline: z.string().optional(),
  isPinned: z.boolean().optional(),
});

export const updateGoalProgressSchema = z.object({
  progress: z.number().min(0).max(100),
  currentValue: z.number().optional(),
});

export const listGoalsQuerySchema = z.object({
  period: goalPeriodSchema.optional(),
  status: goalStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  xpReward: z.number().int().min(0).optional(),
});
