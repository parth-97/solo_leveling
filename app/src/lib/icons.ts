// app/src/lib/icons.ts
// Resolves Lucide icon name strings (from the API) to actual React components.
// The API sends iconName: string; the frontend maps it here.
//
// Add new icons to ICON_MAP as the categories/achievements tables grow.

import {
  Dumbbell,
  BookOpen,
  Code,
  Brain,
  Flame,
  Trophy,
  Star,
  Shield,
  Zap,
  Heart,
  Target,
  TrendingUp,
  Music,
  Palette,
  Globe,
  Sword,
  Footprints,
  CheckCircle,
  Crown,
  Calendar,
  Hexagon,
  Sparkles,
  Users,
  DollarSign,
  Coffee,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  // Habit / category icons
  Dumbbell,
  BookOpen,
  Code,
  Brain,
  Flame,
  Heart,
  Target,
  TrendingUp,
  Music,
  Palette,
  Globe,
  Sword,
  Users,
  DollarSign,
  Coffee,
  Moon,
  Sun,
  Hexagon,
  Sparkles,
  Zap,
  Shield,

  // Achievement icons
  Trophy,
  Star,
  CheckCircle,
  Crown,
  Calendar,
  Footprints,
};

/**
 * Returns the Lucide icon component for a given name string.
 * Falls back to Star if the name is unknown.
 *
 * Usage:
 *   const Icon = resolveIcon(habit.iconName)
 *   return <Icon className="w-4 h-4" />
 */
export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Star;
}
