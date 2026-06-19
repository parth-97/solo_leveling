import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  HelpCircle,
  ChevronRight,
  Moon,
  Volume2,
  Mail,
  Smartphone,
  Eye,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useProfile, useUpdateProfile, useResetProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

type ActionKey = 'editProfile' | 'isPublic' | 'pushNotifications' | 'emailNotifications' | 'unsupported';

interface SettingsItem {
  label: string;
  description: string;
  icon: LucideIcon;
  action: ActionKey;
  toggle?: boolean;
  fixedValue?: boolean;
}

interface SettingsSection {
  title: string;
  icon: LucideIcon;
  items: SettingsItem[];
}

const sections: SettingsSection[] = [
  {
    title: 'Account',
    icon: User,
    items: [
      { label: 'Edit Profile', description: 'Name, avatar, bio', icon: User, action: 'editProfile' as const },
      { label: 'Public Profile', description: 'Allow others to view your profile', icon: Eye, toggle: true, action: 'isPublic' as const },
      { label: 'Change Password', description: 'Update your security', icon: Shield, action: 'unsupported' as const },
      { label: 'Two-Factor Auth', description: 'Add extra security', icon: Shield, action: 'unsupported' as const },
    ],
  },
  {
    title: 'Notifications',
    icon: Bell,
    items: [
      { label: 'Push Notifications', description: 'Quest reminders & alerts', icon: Smartphone, toggle: true, action: 'pushNotifications' as const },
      { label: 'Email Notifications', description: 'Weekly summaries', icon: Mail, toggle: true, action: 'emailNotifications' as const },
      { label: 'Sound Effects', description: 'XP gain & achievements', icon: Volume2, toggle: true, action: 'unsupported' as const },
    ],
  },
  {
    title: 'Appearance',
    icon: Palette,
    items: [
      { label: 'Dark Mode', description: 'Always on', icon: Moon, toggle: true, action: 'unsupported' as const, fixedValue: true },
      { label: 'Reduced Motion', description: 'Disable animations', icon: Eye, toggle: true, action: 'unsupported' as const },
    ],
  },
  {
    title: 'Language & Region',
    icon: Globe,
    items: [
      { label: 'Language', description: 'English (US)', icon: Globe, action: 'unsupported' as const },
      { label: 'Time Zone', description: 'Set in Edit Profile', icon: Globe, action: 'editProfile' as const },
    ],
  },
  {
    title: 'Support',
    icon: HelpCircle,
    items: [
      { label: 'Help Center', description: 'FAQs and guides', icon: HelpCircle, action: 'unsupported' as const },
      { label: 'Contact Support', description: 'Get help from our team', icon: Mail, action: 'unsupported' as const },
      { label: 'Privacy Policy', description: 'How we handle your data', icon: Shield, action: 'unsupported' as const },
    ],
  },
];

export default function Settings() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const resetProfile = useResetProfile();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [editForm, setEditForm] = useState({ displayName: '', bio: '', timezone: '' });

  useEffect(() => {
    if (profile) {
      setEditForm({
        displayName: profile.displayName,
        bio: profile.bio ?? '',
        timezone: profile.timezone,
      });
    }
  }, [profile]);

  const getToggleValue = (action: string, fixedValue?: boolean): boolean => {
    if (fixedValue !== undefined) return fixedValue;
    if (!profile) return false;
    switch (action) {
      case 'isPublic':
        return profile.isPublic;
      case 'pushNotifications':
        return profile.pushNotifications;
      case 'emailNotifications':
        return profile.emailNotifications;
      default:
        return false;
    }
  };

  const handleToggle = (action: string) => {
    if (!profile) return;
    switch (action) {
      case 'isPublic':
        updateProfile.mutate({ isPublic: !profile.isPublic });
        break;
      case 'pushNotifications':
        updateProfile.mutate({ pushNotifications: !profile.pushNotifications });
        break;
      case 'emailNotifications':
        updateProfile.mutate({ emailNotifications: !profile.emailNotifications });
        break;
      default:
        break; // unsupported — no-op
    }
  };

  const handleItemClick = (action: string) => {
    if (action === 'editProfile') setShowEditProfile(true);
  };

  const handleSaveProfile = () => {
    updateProfile.mutate(
      {
        displayName: editForm.displayName,
        bio: editForm.bio || undefined,
        timezone: editForm.timezone,
      },
      { onSuccess: () => setShowEditProfile(false) }
    );
  };

  const handleReset = () => {
    resetProfile.mutate(undefined, {
      onSuccess: () => {
        setShowResetConfirm(false);
        setResetConfirmText('');
        // Small tick so the cache seed (queryClient.clear + setQueryData)
        // completes before OnboardingGate reads the profile on the new route.
        setTimeout(() => navigate('/onboarding', { replace: true }), 50);
      },
    });
  };

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner className="w-8 h-8 text-blue-400" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-3xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Customize your hunter experience</p>
      </motion.div>

      {/* Settings Sections */}
      {sections.map((section) => (
        <motion.div key={section.title} variants={itemVariants} className="glass-card rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <section.icon className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-white">{section.title}</h3>
          </div>

          <div className="space-y-1">
            {section.items.map((item) => {
              const isUnsupported = item.action === 'unsupported';
              return (
                <motion.button
                  key={item.label}
                  onClick={() => !item.toggle && handleItemClick(item.action)}
                  disabled={isUnsupported && !item.toggle}
                  title={isUnsupported ? "This setting isn't supported by the API yet" : undefined}
                  className={cn(
                    'w-full flex items-center gap-4 p-3 rounded-xl transition-colors text-left',
                    isUnsupported && !item.toggle
                      ? 'cursor-not-allowed opacity-50'
                      : 'hover:bg-white/5'
                  )}
                  whileHover={!isUnsupported || item.toggle ? { x: 4 } : {}}
                >
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  {item.toggle ? (
                    <Switch
                      checked={getToggleValue(item.action, 'fixedValue' in item ? item.fixedValue : undefined)}
                      disabled={isUnsupported}
                      onCheckedChange={() => handleToggle(item.action)}
                    />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      ))}

      {/* Danger Zone */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5 border-red-500/10">
        <h3 className="text-base font-semibold text-red-400 mb-4">Danger Zone</h3>
        <div className="space-y-3">
          <motion.button
            onClick={() => signOut()}
            className="w-full p-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/5 transition-colors text-sm font-medium"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            Sign Out
          </motion.button>
          <motion.button
            onClick={() => setShowResetConfirm(true)}
            className="w-full p-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/5 transition-colors text-sm font-medium"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            Reset All Progress
          </motion.button>
          <motion.button
            disabled
            title="Account deletion isn't supported by the API yet"
            className="w-full p-3 rounded-xl border border-red-500/20 text-red-400 opacity-50 cursor-not-allowed transition-colors text-sm font-medium"
          >
            Delete Account
          </motion.button>
        </div>
      </motion.div>

      {/* Edit Profile Modal */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Display Name</label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm((p) => ({ ...p, displayName: e.target.value }))}
                className="bg-[#0a0a0f] border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Bio</label>
              <Input
                value={editForm.bio}
                onChange={(e) => setEditForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Tell other hunters about yourself"
                className="bg-[#0a0a0f] border-white/10 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Time Zone</label>
              <Input
                value={editForm.timezone}
                onChange={(e) => setEditForm((p) => ({ ...p, timezone: e.target.value }))}
                placeholder="e.g., America/New_York"
                className="bg-[#0a0a0f] border-white/10 text-white"
              />
            </div>
            <p className="text-[11px] text-gray-600">
              Avatar changes aren't supported yet — only file-based avatar uploads are available via the API.
            </p>
            {updateProfile.isError && (
              <p className="text-xs text-red-400">
                {updateProfile.error instanceof Error ? updateProfile.error.message : 'Failed to save changes.'}
              </p>
            )}
            <motion.button
              onClick={handleSaveProfile}
              disabled={updateProfile.isPending}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset All Progress Confirmation Modal */}
      <Dialog
        open={showResetConfirm}
        onOpenChange={(open) => {
          if (!open) setResetConfirmText('');
          setShowResetConfirm(open);
        }}
      >
        <DialogContent className="bg-[#12121a] border-red-500/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Reset All Progress
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 space-y-2">
              <p className="text-sm text-red-300 font-medium">This will permanently delete:</p>
              <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                <li>All XP, levels, and rank progress</li>
                <li>All habits and tracking history</li>
                <li>All goals and milestones</li>
                <li>All quest completions</li>
                <li>All achievements and streaks</li>
              </ul>
              <p className="text-xs text-gray-500 pt-1">
                Your account, username, and settings will be kept. This action cannot be undone.
              </p>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">
                Type <span className="font-mono text-red-400 font-semibold">RESET</span> to confirm
              </label>
              <Input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="bg-[#0a0a0f] border-white/10 text-white font-mono"
                autoComplete="off"
              />
            </div>

            {resetProfile.isError && (
              <p className="text-xs text-red-400">
                {resetProfile.error instanceof Error
                  ? resetProfile.error.message
                  : 'Failed to reset profile. Please try again.'}
              </p>
            )}

            <div className="flex gap-3">
              <motion.button
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetConfirmText('');
                }}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition-colors text-sm font-medium"
                whileTap={{ scale: 0.98 }}
                disabled={resetProfile.isPending}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleReset}
                disabled={resetConfirmText !== 'RESET' || resetProfile.isPending}
                className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                whileTap={{ scale: 0.98 }}
              >
                {resetProfile.isPending ? 'Resetting...' : 'Reset Everything'}
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
