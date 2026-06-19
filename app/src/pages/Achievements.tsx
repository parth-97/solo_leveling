import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveIcon } from '@/lib/icons';
import { useAchievements } from '@/hooks/useAchievements';
import { Spinner } from '@/components/ui/spinner';
import { shortDate } from '@/lib/time';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const rarityConfig: Record<string, { color: string; label: string; bg: string; border: string }> = {
  common: { color: '#94a3b8', label: 'Common', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  rare: { color: '#3b82f6', label: 'Rare', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  epic: { color: '#8b5cf6', label: 'Epic', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  legendary: { color: '#f59e0b', label: 'Legendary', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
};

const categories = ['All', 'Unlocked', 'Locked', 'Common', 'Rare', 'Epic', 'Legendary'];

export default function Achievements() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null);

  const { data: achievements, isLoading } = useAchievements();
  const achievementList = achievements ?? [];

  const filteredAchievements = achievementList.filter((ach) => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Unlocked') return !!ach.unlocked;
    if (selectedCategory === 'Locked') return !ach.unlocked;
    return ach.rarity === selectedCategory.toLowerCase();
  });

  const unlockedCount = achievementList.filter((a) => a.unlocked).length;
  const totalCount = achievementList.length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Achievements</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unlockedCount} of {totalCount} unlocked — Keep pushing your limits
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#12121a] rounded-xl px-4 py-2 border border-white/5">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-white font-medium">{unlockedCount}/{totalCount}</span>
          </div>
        </div>
      </motion.div>

      {/* Progress Bar */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">Collection Progress</span>
          <span className="text-sm font-bold text-white">
            {totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%
          </span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-yellow-500"
            initial={{ width: 0 }}
            animate={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' as const }}
          />
        </div>
        <div className="flex justify-between mt-3">
          {(['common', 'rare', 'epic', 'legendary'] as const).map((rarity) => {
            const count = achievementList.filter((a) => a.rarity === rarity && a.unlocked).length;
            const total = achievementList.filter((a) => a.rarity === rarity).length;
            const config = rarityConfig[rarity];
            return (
              <div key={rarity} className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', config.bg.replace('/10', ''))} style={{ backgroundColor: config.color }} />
                <span className="text-[10px] text-gray-500">{config.label}</span>
                <span className="text-[10px] text-white font-medium">{count}/{total}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <motion.button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              'px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              selectedCategory === cat
                ? 'bg-blue-500 text-white'
                : 'bg-[#12121a] text-gray-400 border border-white/10 hover:text-white'
            )}
            whileTap={{ scale: 0.95 }}
          >
            {cat}
          </motion.button>
        ))}
      </motion.div>

      {/* Achievement Grid */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Spinner className="w-8 h-8 text-blue-400" />
        </div>
      )}

      {!isLoading && filteredAchievements.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">
          No achievements match this filter.
        </div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredAchievements.map((achievement) => {
          const config = rarityConfig[achievement.rarity];
          const isSelected = selectedAchievement === achievement.id;
          const AchievementIcon = resolveIcon(achievement.iconName);

          return (
            <motion.div
              key={achievement.id}
              layout
              className={cn(
                'glass-card rounded-2xl p-5 text-center cursor-pointer transition-all relative overflow-hidden',
                achievement.unlocked ? 'glass-card-hover' : 'opacity-50 grayscale'
              )}
              onClick={() => setSelectedAchievement(isSelected ? null : achievement.id)}
              whileHover={achievement.unlocked ? { y: -4, scale: 1.02 } : {}}
              whileTap={{ scale: 0.98 }}
            >
              {/* Rarity glow for unlocked */}
              {achievement.unlocked && (
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${config.color}, transparent 70%)`,
                  }}
                />
              )}

              <div className="relative">
                {/* Icon */}
                <motion.div
                  className={cn(
                    'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3',
                    achievement.unlocked ? config.bg : 'bg-gray-800/50',
                    achievement.unlocked && config.border
                  )}
                  style={achievement.unlocked ? { border: `1px solid ${config.color}30` } : {}}
                  animate={achievement.unlocked ? {
                    boxShadow: [
                      `0 0 0px ${config.color}00`,
                      `0 0 20px ${config.color}30`,
                      `0 0 0px ${config.color}00`,
                    ],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {achievement.unlocked ? (
                    <AchievementIcon className="w-8 h-8" style={{ color: config.color }} />
                  ) : (
                    <Lock className="w-6 h-6 text-gray-600" />
                  )}
                </motion.div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-white mb-1">{achievement.title}</h3>
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{achievement.description}</p>

                {/* Rarity Badge */}
                <span
                  className={cn(
                    'inline-block text-[10px] font-bold px-2 py-0.5 rounded-full',
                    config.bg
                  )}
                  style={{ color: config.color }}
                >
                  {config.label}
                </span>

                {/* Unlock info */}
                <AnimatePresence>
                  {isSelected && achievement.unlocked && achievement.unlockedAt && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-white/5"
                    >
                      <p className="text-[10px] text-gray-500">
                        Unlocked on {shortDate(achievement.unlockedAt)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
