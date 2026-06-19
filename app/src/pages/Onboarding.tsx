import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hexagon,
  ArrowRight,
  ArrowLeft,
  Check,
  BookOpen,
  Zap,
  Brain,
  Palette,
  Globe,
  Dumbbell,
  Sparkles,
  Sword,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { mockCategories as fallbackCategories } from '@/data/mockData';
import { RANKS } from '@/lib/ranks';
import { cn } from '@/lib/utils';
import { resolveIcon } from '@/lib/icons';
import { useCategories } from '@/hooks/useNotifications';
import { useProfile, useCompleteOnboarding } from '@/hooks/useProfile';

// ─── Local types ────────────────────────────────────────────────────────────

/**
 * Unified category shape that works for both API categories (iconName: string)
 * and the fallback mockCategories (icon: LucideIcon). This avoids the TypeScript
 * error that arises from trying to union the two incompatible shapes.
 */
interface DisplayCategory {
  id: string;
  name: string;
  color: string;
  description: string | null;
  icon?: LucideIcon;        // present in mockCategories
  iconName?: string;        // present in API Category
}

// ─── Static data ─────────────────────────────────────────────────────────────

const goals: { id: string; title: string; description: string; icon: LucideIcon; color: string }[] = [
  { id: 'fitness',      title: 'Get Fit',        description: 'Build strength and endurance',  icon: Dumbbell, color: '#3b82f6' },
  { id: 'learn',        title: 'Learn Skills',   description: 'Master new abilities',           icon: BookOpen, color: '#8b5cf6' },
  { id: 'productivity', title: 'Be Productive',  description: 'Optimize your output',           icon: Zap,      color: '#06b6d4' },
  { id: 'mindfulness',  title: 'Find Balance',   description: 'Mental wellness & focus',        icon: Brain,    color: '#ec4899' },
  { id: 'creative',     title: 'Create',         description: 'Express your creativity',        icon: Palette,  color: '#f59e0b' },
  { id: 'social',       title: 'Connect',        description: 'Build relationships',            icon: Globe,    color: '#10b981' },
];

const avatars = [
  { id: '1', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face' },
  { id: '2', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face' },
  { id: '3', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face' },
  { id: '4', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face' },
  { id: '5', url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop&crop=face' },
  { id: '6', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const completeOnboarding = useCompleteOnboarding();
  const { data: apiCategories } = useCategories();

  const [step, setStep]                         = useState(0);
  const [selectedGoals, setSelectedGoals]       = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar]     = useState('1');
  const [hunterName, setHunterName]             = useState(profile?.displayName ?? '');
  const [submitError, setSubmitError]           = useState<string | null>(null);

  // Normalise API categories and mock fallback to the same DisplayCategory shape
  const categoryList: DisplayCategory[] = apiCategories
    ? apiCategories.map((c) => ({
        id:          c.id,
        name:        c.name,
        color:       c.color,
        description: c.description,
        iconName:    c.iconName,
      }))
    : (fallbackCategories as DisplayCategory[]);

  const toggleGoal = (id: string) =>
    setSelectedGoals((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);

  const toggleCategory = (id: string) =>
    setSelectedCategories((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  // ─── Steps ─────────────────────────────────────────────────────────────────

  const steps = [

    // Step 0 — Welcome / Hunter Name
    <div key="welcome" className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 relative mx-auto"
      >
        <Hexagon className="w-10 h-10 text-blue-400" />
        <motion.div
          className="absolute -top-1 -right-1"
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-5 h-5 text-purple-400" />
        </motion.div>
      </motion.div>

      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Welcome, Hunter</h2>
        <p className="text-gray-400 max-w-sm mx-auto">
          The System has recognized your potential. Let's configure your hunter profile to begin your leveling journey.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-5 max-w-sm mx-auto">
        <label className="text-xs text-gray-500 mb-2 block text-left">Choose your hunter name</label>
        <input
          type="text"
          value={hunterName}
          onChange={(e) => setHunterName(e.target.value)}
          placeholder="e.g., Shadow Monarch"
          className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
        />
      </div>
    </div>,

    // Step 1 — Select Goals
    <div key="goals" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Select Your Goals</h2>
        <p className="text-sm text-gray-400">What areas do you want to level up in?</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {goals.map((goal) => {
          const isSelected = selectedGoals.includes(goal.id);
          return (
            <motion.button
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              // FIX: added `relative` so the absolute checkmark is positioned correctly
              className={cn(
                'p-4 rounded-2xl border transition-all text-left relative',
                isSelected
                  ? 'border-blue-500/30 bg-blue-500/5'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              )}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${goal.color}15` }}
              >
                <goal.icon className="w-5 h-5" style={{ color: goal.color }} />
              </div>
              <h3 className="text-sm font-semibold text-white">{goal.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>,

    // Step 2 — Select Categories
    <div key="categories" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Categories</h2>
        <p className="text-sm text-gray-400">Select the quest categories that interest you</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {categoryList.map((cat) => {
          const isSelected = selectedCategories.includes(cat.id);
          // FIX: resolves icon from either the API's iconName string or the mock's LucideIcon ref
          const CatIcon: LucideIcon = cat.icon ?? resolveIcon(cat.iconName ?? '');
          return (
            <motion.button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                'p-4 rounded-2xl border transition-all text-left relative',
                isSelected
                  ? 'border-blue-500/30 bg-blue-500/5'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/10'
              )}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: `${cat.color}15` }}
              >
                <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
              </div>
              <h3 className="text-sm font-semibold text-white">{cat.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>,

    // Step 3 — Choose Avatar
    <div key="avatar" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Avatar</h2>
        <p className="text-sm text-gray-400">Select your hunter appearance</p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
        {avatars.map((avatar) => (
          <motion.button
            key={avatar.id}
            onClick={() => setSelectedAvatar(avatar.id)}
            className={cn(
              'relative rounded-2xl overflow-hidden aspect-square',
              selectedAvatar === avatar.id
                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0a0a0f]'
                : 'opacity-60 hover:opacity-100'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img src={avatar.url} alt="Avatar" className="w-full h-full object-cover" />
            {selectedAvatar === avatar.id && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 bg-blue-500/20 flex items-center justify-center"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-5 max-w-sm mx-auto text-center">
        <img
          src={avatars.find((a) => a.id === selectedAvatar)?.url}
          alt="Selected"
          className="w-16 h-16 rounded-full mx-auto mb-3 object-cover ring-2 ring-blue-500/30"
        />
        <p className="text-sm text-white font-medium">{hunterName || 'Hunter'}</p>
        <p className="text-xs text-gray-500">E-Rank • Level 1</p>
      </div>
    </div>,

    // Step 4 — Rank Assignment
    <div key="rank" className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 150 }}
        className="relative inline-block"
      >
        <div
          className="w-32 h-32 rounded-3xl flex items-center justify-center mx-auto relative"
          style={{
            background: 'linear-gradient(135deg, rgba(100,116,139,0.2), rgba(100,116,139,0.05))',
            border: '2px solid rgba(100,116,139,0.3)',
          }}
        >
          <motion.span
            className="text-7xl font-black"
            style={{
              color: 'transparent',
              background: 'linear-gradient(135deg, #64748b, #94a3b8)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
            animate={{
              textShadow: [
                '0 0 0px rgba(100,116,139,0)',
                '0 0 40px rgba(100,116,139,0.3)',
                '0 0 0px rgba(100,116,139,0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            E
          </motion.span>
        </div>
        <motion.div
          className="absolute -top-2 -right-2"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' as const }}
        >
          <Star className="w-6 h-6 text-yellow-400" />
        </motion.div>
      </motion.div>

      <div>
        <h2 className="text-3xl font-bold text-white mb-2">E-Rank Assigned</h2>
        <p className="text-gray-400 max-w-sm mx-auto">
          Every legend starts at the bottom. Complete quests, build habits, and rise through the ranks to become an S-Rank Hunter.
        </p>
      </div>

      <div className="flex justify-center gap-2 flex-wrap">
        {Object.entries(RANKS).map(([rank, info]) => (
          <div
            key={rank}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold',
              rank === 'E' ? 'ring-1' : ''
            )}
            style={{
              backgroundColor: `${info.color}15`,
              color: rank === 'E' ? info.color : '#64748b',
              boxShadow: `0 0 0 2px ${info.color}30`,
            }}
          >
            {/* National / Monarch are long — show first char only */}
            {rank.length > 1 ? rank[0] : rank}
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-5 max-w-sm mx-auto">
        <div className="flex items-center gap-3">
          <Sword className="w-5 h-5 text-blue-400" />
          <div className="text-left">
            <p className="text-sm text-white font-medium">Your journey begins</p>
            <p className="text-xs text-gray-500">Complete your first quest to gain XP</p>
          </div>
        </div>
      </div>
    </div>,
  ];

  // ─── Guard ─────────────────────────────────────────────────────────────────

  const canProceed = () => {
    if (step === 0) return hunterName.trim().length > 0;
    if (step === 1) return selectedGoals.length > 0;
    if (step === 2) return selectedCategories.length > 0;
    return true;
  };

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitError(null);
    try {
      await completeOnboarding.mutateAsync({
        displayName: hunterName.trim(),
        // FIX: pass the actual selected category IDs (was hardcoded to [])
        categoryIds: selectedCategories,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // FIX: pass the selected avatar URL so it gets persisted on the server
        avatarUrl: avatars.find((a) => a.id === selectedAvatar)?.url,
      } as Parameters<typeof completeOnboarding.mutateAsync>[0]);
      navigate('/dashboard');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-[150px]" />

      <div className="w-full max-w-lg relative">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: i <= step ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            </div>
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[400px] flex items-center"
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <motion.button
            onClick={() => (step > 0 ? setStep(step - 1) : navigate('/landing'))}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 0 ? 'Back' : 'Previous'}
          </motion.button>

          <motion.button
            onClick={() => {
              if (step < steps.length - 1) {
                setStep(step + 1);
              } else {
                handleSubmit();
              }
            }}
            disabled={!canProceed() || completeOnboarding.isPending}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all',
              canProceed() && !completeOnboarding.isPending
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            )}
            whileHover={canProceed() ? { scale: 1.02 } : {}}
            whileTap={canProceed() ? { scale: 0.98 } : {}}
          >
            {completeOnboarding.isPending
              ? 'Entering...'
              : step === steps.length - 1
                ? 'Enter the System'
                : 'Continue'}
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>

        {submitError && (
          <p className="text-center text-xs text-red-400 mt-4">{submitError}</p>
        )}
      </div>
    </div>
  );
}
