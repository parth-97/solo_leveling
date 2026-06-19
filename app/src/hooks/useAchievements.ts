import { useQuery } from '@tanstack/react-query';
import { achievementsApi } from '@/lib/api/achievements';
import { useAuth } from '@/contexts/AuthContext';

export const achievementsKeys = {
  all: ['achievements'] as const,
  unlocked: ['achievements', 'unlocked'] as const,
};

/** Fetches all achievement definitions, with `unlocked`/`unlockedAt` joined for the current user. */
export function useAchievements() {
  const { session } = useAuth();
  return useQuery({
    queryKey: achievementsKeys.all,
    queryFn: achievementsApi.list,
    enabled: !!session,
  });
}

/** Fetches only the achievements the current user has unlocked. */
export function useUnlockedAchievements() {
  const { session } = useAuth();
  return useQuery({
    queryKey: achievementsKeys.unlocked,
    queryFn: achievementsApi.unlocked,
    enabled: !!session,
  });
}
