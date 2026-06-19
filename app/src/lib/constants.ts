import type { RankInfo, RankTier } from '@/types/shared';

/**
 * Canonical rank metadata per shared contract / MIGRATION.md §3.
 * Adds 'National' and 'Monarch' tiers beyond the original frontend RANKS.
 * Mirrors files/00_MASTER_ARCHITECTURE.md §3 rank thresholds.
 */
export const RANKS: Record<RankTier, RankInfo> = {
  E: { rank: 'E', label: 'Weakest', minLevel: 1, color: '#64748b', xpRequired: 0 },
  D: { rank: 'D', label: 'Apprentice', minLevel: 5, color: '#94a3b8', xpRequired: 960 },
  C: { rank: 'C', label: 'Adept', minLevel: 10, color: '#06b6d4', xpRequired: 3981 },
  B: { rank: 'B', label: 'Expert', minLevel: 20, color: '#3b82f6', xpRequired: 13195 },
  A: { rank: 'A', label: 'Master', minLevel: 35, color: '#8b5cf6', xpRequired: 36563 },
  S: { rank: 'S', label: 'Legend', minLevel: 50, color: '#f59e0b', xpRequired: 83176 },
  National: { rank: 'National', label: 'National Hero', minLevel: 100, color: '#ef4444', xpRequired: 500000 },
  Monarch: { rank: 'Monarch', label: 'Shadow Monarch', minLevel: 150, color: '#7c3aed', xpRequired: 1500000 },
};
