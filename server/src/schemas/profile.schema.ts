import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(280).optional(),
  timezone: z.string().min(1).max(64).optional(),
  isPublic: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
});

export const completeOnboardingSchema = z.object({
  displayName: z.string().min(1).max(50),
  timezone: z.string().min(1).max(64),
  // Accepted for forward-compatibility but not persisted — see note in
  // src/app/api/v1/onboarding/complete/route.ts (no schema table exists
  // for storing per-user category interests).
  categoryIds: z.array(z.string().uuid()).default([]),
});
