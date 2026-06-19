// app/src/lib/ranks.ts
// Canonical RANKS constant — replaces mockData.RANKS.
// Includes all 8 tiers from the shared RankTier type.
//
// Usage in Onboarding.tsx:
//   import { RANKS } from '@/lib/ranks'   ← replace mockData import
//
// Components that iterate Object.entries(RANKS) will now also render
// 'National' and 'Monarch' tiers.

import type { RankTier, RankInfo } from '@/types/shared';

export const RANKS: Record<RankTier, RankInfo> = {
  E: {
    rank: 'E',
    label: 'Weakest',
    minLevel: 1,
    color: '#64748b',
    xpRequired: 0,
  },
  D: {
    rank: 'D',
    label: 'Apprentice',
    minLevel: 5,
    color: '#94a3b8',
    xpRequired: 960,
  },
  C: {
    rank: 'C',
    label: 'Adept',
    minLevel: 20,
    color: '#06b6d4',
    xpRequired: 3981,
  },
  B: {
    rank: 'B',
    label: 'Expert',
    minLevel: 35,
    color: '#3b82f6',
    xpRequired: 13195,
  },
  A: {
    rank: 'A',
    label: 'Master',
    minLevel: 50,
    color: '#8b5cf6',
    xpRequired: 36563,
  },
  S: {
    rank: 'S',
    label: 'Legend',
    minLevel: 75,
    color: '#f59e0b',
    xpRequired: 83176,
  },
  National: {
    rank: 'National',
    label: 'National Hero',
    minLevel: 100,
    color: '#ef4444',
    xpRequired: 500000,
  },
  Monarch: {
    rank: 'Monarch',
    label: 'Shadow Monarch',
    minLevel: 150,
    color: '#7c3aed',
    xpRequired: 1500000,
  },
};

/** Returns the rank info for a given tier, with a safe fallback. */
export function getRankInfo(tier: RankTier): RankInfo {
  return RANKS[tier] ?? RANKS['E'];
}
