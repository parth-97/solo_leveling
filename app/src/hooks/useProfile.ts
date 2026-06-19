import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/lib/api/profile';
import type { UpdateProfileInput } from '@/types/shared';
import type { CompleteOnboardingInput } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';

export const profileKeys = {
  me: ['profile', 'me'] as const,
  myStats: ['profile', 'me', 'stats'] as const,
};

/** Fetches the current user's profile. Disabled until authenticated. */
export function useProfile() {
  const { session } = useAuth();
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: profileApi.getMe,
    enabled: !!session,
  });
}

/** Fetches the current user's aggregate stats (quests, habits, streaks). */
export function useProfileStats() {
  const { session } = useAuth();
  return useQuery({
    queryKey: profileKeys.myStats,
    queryFn: profileApi.getMyStats,
    enabled: !!session,
  });
}

/** Completes onboarding: sets display name, avatar, categories, goals, timezone. */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompleteOnboardingInput) => profileApi.completeOnboarding(input),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.me, data);
    },
  });
}

/** Updates the current user's profile and refreshes the cache. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => profileApi.updateMe(input),
    onSuccess: (data) => {
      queryClient.setQueryData(profileKeys.me, data);
    },
  });
}

/** Uploads a new avatar image and refreshes the profile cache. */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
    },
  });
}

/**
 * Resets all gameplay progress (XP, level, rank, streaks, habits, goals,
 * achievements, quest completions) and redirects to onboarding.
 *
 * Uses queryClient.clear() to instantly wipe every cached query so no
 * stale data (quests, habits, analytics, etc.) leaks through to the
 * next page render. The fresh reset profile is then seeded into the
 * cache so OnboardingGate immediately sees onboardingCompleted=false
 * and redirects correctly.
 */
export function useResetProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => profileApi.resetProfile(),
    onSuccess: (data) => {
      // Nuke the entire cache — no stale habits/quests/analytics survive.
      queryClient.clear();
      // Seed the reset profile so OnboardingGate reads it without a round-trip.
      queryClient.setQueryData(profileKeys.me, data);
    },
  });
}
