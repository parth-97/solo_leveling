import {
  Sword, BookOpen, Flame, Trophy, Star, Shield,
  Zap, Heart, Target, TrendingUp, Brain, Dumbbell,
  Code, Music, Palette, Globe,
  type LucideIcon,
} from 'lucide-react';

// ─── Typed interfaces for mock data ──────────────────────────────────────────

interface MockHabit {
  id: string; name: string; icon: LucideIcon; color: string;
  streak: number; maxStreak: number; completion: number[];
  weeklyTarget: number; weeklyCompleted: number;
}

interface MockAchievement {
  id: string; title: string; description: string; icon: LucideIcon;
  unlocked: boolean; unlockedDate?: string; rarity: string;
}

interface MockCategory {
  id: string; name: string; icon: LucideIcon; color: string; description: string;
}

interface MockFeature {
  id: string; title: string; description: string; icon: LucideIcon; color: string;
}

export const RANKS = {
  E: { color: '#64748b', label: 'Novice', minLevel: 1 },
  D: { color: '#94a3b8', label: 'Apprentice', minLevel: 5 },
  C: { color: '#06b6d4', label: 'Adept', minLevel: 10 },
  B: { color: '#3b82f6', label: 'Expert', minLevel: 20 },
  A: { color: '#8b5cf6', label: 'Master', minLevel: 35 },
  S: { color: '#f59e0b', label: 'Legend', minLevel: 50 },
} as const;

export const mockUser = {
  id: '1',
  name: 'Sung Jin-Woo',
  email: 'shadow@monarch.com',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
  rank: 'B' as keyof typeof RANKS,
  level: 14,
  xp: 7300,
  maxXp: 10000,
  streak: 24,
  maxStreak: 45,
  lifeScore: 85,
  disciplineScore: 92,
  growthScore: 78,
  powerScore: 72,
  joinDate: '2026-01-15',
  questsCompleted: 156,
  habitsTracked: 12,
  achievements: 23,
};

export const mockDailyQuests = [
  { id: '1', title: 'Complete morning workout routine', xp: 150, completed: true, category: 'Fitness', difficulty: 2 },
  { id: '2', title: 'Read 30 pages of Atomic Habits', xp: 200, completed: false, category: 'Learning', difficulty: 1 },
  { id: '3', title: 'Practice meditation for 15 minutes', xp: 100, completed: false, category: 'Mindfulness', difficulty: 1 },
  { id: '4', title: 'Complete coding challenge', xp: 250, completed: false, category: 'Skills', difficulty: 3 },
  { id: '5', title: 'Drink 8 glasses of water', xp: 80, completed: true, category: 'Health', difficulty: 1 },
];

export const mockHabits: MockHabit[] = [
  {
    id: '1',
    name: 'Exercise',
    icon: Dumbbell,
    color: '#3b82f6',
    streak: 24,
    maxStreak: 45,
    completion: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1],
    weeklyTarget: 5,
    weeklyCompleted: 4,
  },
  {
    id: '2',
    name: 'Reading',
    icon: BookOpen,
    color: '#8b5cf6',
    streak: 18,
    maxStreak: 30,
    completion: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
    weeklyTarget: 7,
    weeklyCompleted: 5,
  },
  {
    id: '3',
    name: 'Coding',
    icon: Code,
    color: '#06b6d4',
    streak: 31,
    maxStreak: 60,
    completion: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
    weeklyTarget: 5,
    weeklyCompleted: 5,
  },
  {
    id: '4',
    name: 'Meditation',
    icon: Brain,
    color: '#ec4899',
    streak: 12,
    maxStreak: 20,
    completion: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1],
    weeklyTarget: 7,
    weeklyCompleted: 4,
  },
];

export const mockGoals = [
  {
    id: '1',
    title: 'Run a Marathon',
    description: 'Complete a full 42km marathon by end of year',
    category: 'Fitness',
    progress: 35,
    deadline: '2026-12-31',
    milestones: [
      { id: '1a', title: 'Run 5km without stopping', completed: true },
      { id: '1b', title: 'Run 10km under 60 min', completed: true },
      { id: '1c', title: 'Complete half marathon', completed: false },
      { id: '1d', title: 'Run full marathon', completed: false },
    ],
    xpReward: 5000,
  },
  {
    id: '2',
    title: 'Learn React Advanced Patterns',
    description: 'Master advanced React concepts including hooks, context, and performance',
    category: 'Learning',
    progress: 60,
    deadline: '2026-08-30',
    milestones: [
      { id: '2a', title: 'Complete hooks deep dive', completed: true },
      { id: '2b', title: 'Build custom hook library', completed: true },
      { id: '2c', title: 'Optimize app performance', completed: false },
      { id: '2d', title: 'Contribute to open source', completed: false },
    ],
    xpReward: 3000,
  },
  {
    id: '3',
    title: 'Read 24 Books This Year',
    description: 'Read 2 books per month covering fiction and non-fiction',
    category: 'Learning',
    progress: 50,
    deadline: '2026-12-31',
    milestones: [
      { id: '3a', title: 'Q1: 6 books', completed: true },
      { id: '3b', title: 'Q2: 12 books', completed: true },
      { id: '3c', title: 'Q3: 18 books', completed: false },
      { id: '3d', title: 'Q4: 24 books', completed: false },
    ],
    xpReward: 4000,
  },
  {
    id: '4',
    title: 'Build Side Project',
    description: 'Launch a SaaS product generating $1k MRR',
    category: 'Career',
    progress: 20,
    deadline: '2026-10-31',
    milestones: [
      { id: '4a', title: 'Validate idea', completed: true },
      { id: '4b', title: 'Build MVP', completed: false },
      { id: '4c', title: 'Get first 100 users', completed: false },
      { id: '4d', title: 'Reach $1k MRR', completed: false },
    ],
    xpReward: 10000,
  },
];

export const mockAchievements: MockAchievement[] = [
  { id: '1', title: 'First Blood', description: 'Complete your first quest', icon: Sword, unlocked: true, unlockedDate: '2026-01-15', rarity: 'common' },
  { id: '2', title: 'Bookworm', description: 'Read for 7 days straight', icon: BookOpen, unlocked: true, unlockedDate: '2026-02-01', rarity: 'common' },
  { id: '3', title: 'On Fire', description: 'Maintain a 7-day streak', icon: Flame, unlocked: true, unlockedDate: '2026-01-22', rarity: 'common' },
  { id: '4', title: 'Champion', description: 'Reach top 10 on leaderboard', icon: Trophy, unlocked: true, unlockedDate: '2026-03-10', rarity: 'rare' },
  { id: '5', title: 'Rising Star', description: 'Reach level 10', icon: Star, unlocked: true, unlockedDate: '2026-02-20', rarity: 'rare' },
  { id: '6', title: 'Guardian', description: 'Complete 100 quests', icon: Shield, unlocked: true, unlockedDate: '2026-04-05', rarity: 'epic' },
  { id: '7', title: 'Speed Demon', description: 'Complete 5 quests in one day', icon: Zap, unlocked: false, rarity: 'rare' },
  { id: '8', title: 'Heart of Gold', description: 'Help 10 friends with their goals', icon: Heart, unlocked: false, rarity: 'epic' },
  { id: '9', title: 'Sharpshooter', description: 'Achieve 90%+ accuracy for a week', icon: Target, unlocked: false, rarity: 'legendary' },
  { id: '10', title: 'Unstoppable', description: 'Maintain a 30-day streak', icon: TrendingUp, unlocked: false, rarity: 'legendary' },
  { id: '11', title: 'Composer', description: 'Complete a music composition', icon: Music, unlocked: false, rarity: 'rare' },
  { id: '12', title: 'Artist', description: 'Create 50 digital artworks', icon: Palette, unlocked: false, rarity: 'epic' },
];

export const mockLeaderboard = [
  { id: '1', name: 'Cha Hae-In', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', level: 47, xp: 48500, rank: 'S' as keyof typeof RANKS },
  { id: '2', name: 'Go Gun-Hee', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', level: 45, xp: 46200, rank: 'S' as keyof typeof RANKS },
  { id: '3', name: 'Baek Yoon-Ho', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', level: 42, xp: 43800, rank: 'A' as keyof typeof RANKS },
  { id: '4', name: 'Sung Jin-Woo', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face', level: 14, xp: 7300, rank: 'B' as keyof typeof RANKS },
  { id: '5', name: 'Woo Jin-Chul', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', level: 38, xp: 39500, rank: 'A' as keyof typeof RANKS },
  { id: '6', name: 'Choi Jong-In', avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop&crop=face', level: 35, xp: 36200, rank: 'A' as keyof typeof RANKS },
  { id: '7', name: 'Lim Tae-Gyu', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=100&h=100&fit=crop&crop=face', level: 32, xp: 33800, rank: 'A' as keyof typeof RANKS },
  { id: '8', name: 'Ma Dong-Wook', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face', level: 28, xp: 29500, rank: 'B' as keyof typeof RANKS },
];

export const mockFriends = [
  { id: '1', name: 'Cha Hae-In', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', status: 'online', rank: 'S' as keyof typeof RANKS, level: 47, lastActive: 'now' },
  { id: '2', name: 'Woo Jin-Chul', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face', status: 'online', rank: 'A' as keyof typeof RANKS, level: 38, lastActive: '2m ago' },
  { id: '3', name: 'Baek Yoon-Ho', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', status: 'away', rank: 'A' as keyof typeof RANKS, level: 42, lastActive: '15m ago' },
  { id: '4', name: 'Go Gun-Hee', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', status: 'offline', rank: 'S' as keyof typeof RANKS, level: 45, lastActive: '2h ago' },
  { id: '5', name: 'Choi Jong-In', avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&h=100&fit=crop&crop=face', status: 'online', rank: 'A' as keyof typeof RANKS, level: 35, lastActive: '5m ago' },
];

export const mockCommunityFeed = [
  { id: '1', user: mockFriends[0], action: 'completed', target: 'Morning Marathon - 15km run', xp: 450, time: '2m ago' },
  { id: '2', user: mockFriends[1], action: 'achieved', target: 'Sword Master - 30 day streak', xp: 1000, time: '5m ago' },
  { id: '3', user: mockFriends[2], action: 'leveled up', target: 'Level 42 - A Rank', xp: 0, time: '12m ago' },
  { id: '4', user: mockFriends[4], action: 'completed', target: 'Read "Deep Work" - 300 pages', xp: 600, time: '18m ago' },
  { id: '5', user: mockFriends[0], action: 'started', target: 'New Goal: Learn Spanish', xp: 0, time: '25m ago' },
];

export const mockAIInsights = [
  {
    id: '1',
    type: 'insight',
    title: 'Streak Recovery Detected',
    message: 'Your consistency in morning workouts has improved your discipline score by 12% this week. Consider adding a stretching quest to optimize recovery.',
    action: 'Add Stretching Quest',
  },
  {
    id: '2',
    type: 'suggestion',
    title: 'Optimal Quest Time',
    message: 'Based on your patterns, you perform best on coding challenges between 6-8 PM. Schedule your next session during this window.',
    action: 'Schedule Session',
  },
  {
    id: '3',
    type: 'warning',
    title: 'Streak at Risk',
    message: 'Your meditation streak expires in 4 hours. Take 10 minutes now to maintain your 12-day streak!',
    action: 'Meditate Now',
  },
];

export const mockAnalyticsData = {
  weeklyXp: [
    { day: 'Mon', xp: 450, quests: 3 },
    { day: 'Tue', xp: 680, quests: 4 },
    { day: 'Wed', xp: 320, quests: 2 },
    { day: 'Thu', xp: 890, quests: 5 },
    { day: 'Fri', xp: 540, quests: 3 },
    { day: 'Sat', xp: 1200, quests: 6 },
    { day: 'Sun', xp: 750, quests: 4 },
  ],
  monthlyProgress: [
    { month: 'Jan', lifeScore: 62, discipline: 58, growth: 55 },
    { month: 'Feb', lifeScore: 68, discipline: 65, growth: 62 },
    { month: 'Mar', lifeScore: 72, discipline: 74, growth: 68 },
    { month: 'Apr', lifeScore: 78, discipline: 82, growth: 72 },
    { month: 'May', lifeScore: 82, discipline: 88, growth: 76 },
    { month: 'Jun', lifeScore: 85, discipline: 92, growth: 78 },
  ],
  skillRadar: [
    { subject: 'Fitness', A: 85, fullMark: 100 },
    { subject: 'Learning', A: 78, fullMark: 100 },
    { subject: 'Productivity', A: 92, fullMark: 100 },
    { subject: 'Mindfulness', A: 65, fullMark: 100 },
    { subject: 'Creativity', A: 70, fullMark: 100 },
    { subject: 'Social', A: 58, fullMark: 100 },
  ],
  categoryBreakdown: [
    { name: 'Fitness', value: 35, color: '#3b82f6' },
    { name: 'Learning', value: 25, color: '#8b5cf6' },
    { name: 'Productivity', value: 20, color: '#06b6d4' },
    { name: 'Mindfulness', value: 12, color: '#ec4899' },
    { name: 'Creativity', value: 8, color: '#f59e0b' },
  ],
  heatmapData: Array.from({ length: 90 }, (_, i) => ({
    day: i,
    value: Math.floor(Math.random() * 5),
    date: new Date(2026, 3, 1 + i).toISOString().split('T')[0],
  })),
};

export const mockCategories: MockCategory[] = [
  { id: '1', name: 'Fitness', icon: Dumbbell, color: '#3b82f6', description: 'Physical training and exercise' },
  { id: '2', name: 'Learning', icon: BookOpen, color: '#8b5cf6', description: 'Knowledge and skill acquisition' },
  { id: '3', name: 'Productivity', icon: Zap, color: '#06b6d4', description: 'Efficiency and output optimization' },
  { id: '4', name: 'Mindfulness', icon: Brain, color: '#ec4899', description: 'Mental wellness and focus' },
  { id: '5', name: 'Creativity', icon: Palette, color: '#f59e0b', description: 'Artistic and creative pursuits' },
  { id: '6', name: 'Social', icon: Globe, color: '#10b981', description: 'Relationships and community' },
  { id: '7', name: 'Career', icon: Target, color: '#ef4444', description: 'Professional development' },
  { id: '8', name: 'Health', icon: Heart, color: '#f43f5e', description: 'Physical and mental wellbeing' },
];

export const mockChallenges = [
  {
    id: '1',
    title: 'The Monarch\'s Trial',
    description: 'Complete all daily quests for 7 consecutive days',
    duration: '7 days',
    participants: 128,
    xpReward: 2000,
    difficulty: 3,
    endDate: '2026-06-18',
  },
  {
    id: '2',
    title: 'Shadow Extraction',
    description: 'Build 5 new habits simultaneously',
    duration: '30 days',
    participants: 85,
    xpReward: 5000,
    difficulty: 4,
    endDate: '2026-07-11',
  },
  {
    id: '3',
    title: 'Dungeon Rush',
    description: 'Complete 50 quests in one week',
    duration: '7 days',
    participants: 256,
    xpReward: 3000,
    difficulty: 2,
    endDate: '2026-06-15',
  },
];

export const mockTestimonials = [
  {
    id: '1',
    name: 'Alex Chen',
    role: 'Software Engineer',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    content: 'Solo Leveling transformed my daily routine. I went from procrastinating to completing quests every single day. My discipline score went from 45 to 92 in just 3 months!',
    rating: 5,
  },
  {
    id: '2',
    name: 'Sarah Kim',
    role: 'Product Designer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    content: 'The gamification is genius. I actually look forward to my morning workout because it feels like gaining real power. The rank system keeps me incredibly motivated.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Marcus Johnson',
    role: 'Entrepreneur',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    content: 'Best self-improvement app I have ever used. The AI coach gives surprisingly good advice, and the community challenges push me to be better every day.',
    rating: 5,
  },
];

export const mockFeatures: MockFeature[] = [
  {
    id: '1',
    title: 'Quest System',
    description: 'Transform your daily tasks into epic quests with XP rewards and difficulty ratings.',
    icon: Sword,
    color: '#3b82f6',
  },
  {
    id: '2',
    title: 'Habit Forge',
    description: 'Build unbreakable habits with streak tracking, heatmaps, and visual progress.',
    icon: Flame,
    color: '#f59e0b',
  },
  {
    id: '3',
    title: 'Rank Progression',
    description: 'Climb from E-Rank to S-Rank as you level up your real-life skills and abilities.',
    icon: Trophy,
    color: '#8b5cf6',
  },
  {
    id: '4',
    title: 'AI Shadow Monarch',
    description: 'Your personal AI coach analyzes your patterns and provides tailored insights.',
    icon: Brain,
    color: '#ec4899',
  },
  {
    id: '5',
    title: 'Guild System',
    description: 'Join forces with friends, compete on leaderboards, and tackle group challenges.',
    icon: Globe,
    color: '#10b981',
  },
  {
    id: '6',
    title: 'Achievement Gallery',
    description: 'Unlock rare badges and showcase your accomplishments in your hunter profile.',
    icon: Star,
    color: '#06b6d4',
  },
];

export const mockNotifications = [
  { id: '1', type: 'quest', title: 'Quest Completed', message: 'Morning workout routine completed! +150 XP', time: '2m ago', read: false },
  { id: '2', type: 'achievement', title: 'Achievement Unlocked', message: 'You earned "First Blood" badge!', time: '15m ago', read: false },
  { id: '3', type: 'streak', title: 'Streak Milestone', message: '7-day meditation streak! Keep it up!', time: '1h ago', read: true },
  { id: '4', type: 'social', title: 'Friend Activity', message: 'Cha Hae-In completed a 15km run', time: '2h ago', read: true },
  { id: '5', type: 'challenge', title: 'Challenge Update', message: 'Monarch\'s Trial: 3 days remaining', time: '3h ago', read: true },
];
