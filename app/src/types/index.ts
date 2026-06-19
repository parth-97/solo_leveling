import type { LucideIcon } from 'lucide-react';

export type Rank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  rank: Rank;
  level: number;
  xp: number;
  maxXp: number;
  streak: number;
  maxStreak: number;
  lifeScore: number;
  disciplineScore: number;
  growthScore: number;
  powerScore: number;
  joinDate: string;
  questsCompleted: number;
  habitsTracked: number;
  achievements: number;
}

export interface Quest {
  id: string;
  title: string;
  xp: number;
  completed: boolean;
  category: string;
  difficulty: number;
}

export interface Habit {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  streak: number;
  maxStreak: number;
  completion: number[];
  weeklyTarget: number;
  weeklyCompleted: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  deadline: string;
  milestones: Milestone[];
  xpReward: number;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  unlocked: boolean;
  unlockedDate?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  rank: Rank;
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'offline';
  rank: Rank;
  level: number;
  lastActive: string;
}

export interface CommunityActivity {
  id: string;
  user: Friend;
  action: string;
  target: string;
  xp: number;
  time: string;
}

export interface AIInsight {
  id: string;
  type: 'insight' | 'suggestion' | 'warning';
  title: string;
  message: string;
  action: string;
}

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  duration: string;
  participants: number;
  xpReward: number;
  difficulty: number;
  endDate: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export interface Notification {
  id: string;
  type: 'quest' | 'achievement' | 'streak' | 'social' | 'challenge';
  title: string;
  message: string;
  time: string;
  read: boolean;
}
