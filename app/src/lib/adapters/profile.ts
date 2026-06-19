// app/src/lib/adapters/profile.ts
// Maps the API Profile shape to display-ready shapes that
// match legacy field names used in mockData-era components.
//
// Use this in components that still reference old field names
// (name, avatar, maxXp, streak, achievements) while you migrate
// them to the canonical field names from shared.ts.

import type { Profile, RankTier } from '@/types/shared';

export interface DisplayProfile extends Profile {
  /** @deprecated Use displayName */
  name: string;
  /** @deprecated Use avatarUrl */
  avatar: string;
  /** @deprecated Use xpToNextLevel */
  maxXp: number;
  /** @deprecated Use currentStreak */
  streak: number;
  /** @deprecated Use achievementsCount */
  achievements: number;
  /**
   * powerScore is not in the DB. Computed client-side as the average
   * of disciplineScore and productivityScore.
   */
  powerScore: number;
}

/**
 * Adds legacy aliases to a Profile so components that haven't been
 * migrated yet continue to work. Remove aliases one by one as components
 * are updated to use the canonical field names.
 */
export function toDisplayProfile(p: Profile): DisplayProfile {
  return {
    ...p,
    name: p.displayName,
    avatar: p.avatarUrl ?? '',
    maxXp: p.xpToNextLevel,
    streak: p.currentStreak,
    achievements: p.achievementsCount,
    powerScore: Math.round((p.disciplineScore + p.productivityScore) / 2),
  };
}

/**
 * Returns rank metadata for a given RankTier.
 * Matches the full 8-tier Solo Leveling rank system.
 */
export const RANK_META: Record<RankTier, { label: string; color: string; xpRequired: number; minLevel: number }> = {
  E:        { label: 'Weakest',        color: '#64748b', xpRequired: 0,       minLevel: 1   },
  D:        { label: 'Apprentice',     color: '#94a3b8', xpRequired: 960,     minLevel: 5   },
  C:        { label: 'Adept',          color: '#06b6d4', xpRequired: 3981,    minLevel: 20  },
  B:        { label: 'Expert',         color: '#3b82f6', xpRequired: 13195,   minLevel: 35  },
  A:        { label: 'Master',         color: '#8b5cf6', xpRequired: 36563,   minLevel: 50  },
  S:        { label: 'Legend',         color: '#f59e0b', xpRequired: 83176,   minLevel: 75  },
  National: { label: 'National Hero',  color: '#ef4444', xpRequired: 500000,  minLevel: 100 },
  Monarch:  { label: 'Shadow Monarch', color: '#7c3aed', xpRequired: 1500000, minLevel: 150 },
};
