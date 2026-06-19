import { z } from 'zod';

export const sendFriendRequestSchema = z.object({
  addresseeId: z.string().uuid(),
});

export const leaderboardQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
  maxMembers: z.number().int().min(2).max(500).optional(),
});

export const updateGroupSchema = createGroupSchema.partial();

export const createChallengeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  difficulty: z.enum(['easy', 'normal', 'hard', 'elite', 'legendary']),
  xpReward: z.number().int().min(0).max(1000000).optional(),
  startDate: z.string(), // ISO date
  endDate: z.string(),
  maxParticipants: z.number().int().min(1).optional(),
  groupId: z.string().uuid().optional(),
  goalType: z.string().min(1).max(50),
  goalTarget: z.record(z.unknown()),
});

export const updateChallengeProgressSchema = z.object({
  progress: z.number().min(0).max(100),
});
