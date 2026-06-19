import { z } from 'zod';

export const createHabitSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid().optional(),
  iconName: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  weeklyTarget: z.number().int().min(1).max(7).optional(),
  xpPerCompletion: z.number().int().min(1).max(10000).optional(),
});

export const updateHabitSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid().optional(),
  iconName: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  weeklyTarget: z.number().int().min(1).max(7).optional(),
  xpPerCompletion: z.number().int().min(1).max(10000).optional(),
  isActive: z.boolean().optional(),
});

export const logHabitSchema = z.object({
  loggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  note: z.string().max(500).optional(),
});

export const dateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const markMissedSchema = z.object({
  missedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  note: z.string().max(500).optional(),
});
