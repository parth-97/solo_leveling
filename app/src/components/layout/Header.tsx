import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Bell,
  Search,
  Check,
  Trophy,
  Flame,
  Star,
  Zap,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/useNotifications';
import { timeAgo } from '@/lib/time';

interface HeaderProps {
  onMenuClick: () => void;
}

const iconMap: Record<string, React.ElementType> = {
  quest: Check,
  achievement: Trophy,
  streak: Flame,
  social: Users,
  challenge: Zap,
};

export default function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: profile } = useProfile();
  const { data: notificationsRes } = useNotifications({ limit: 10 });
  const { data: unreadData } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsRes?.data ?? [];
  const unreadCount = unreadData?.count ?? 0;

  return (
    <header className="sticky top-0 z-30 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left */}
        <div className="flex items-center gap-4">
          <motion.button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
            whileTap={{ scale: 0.95 }}
          >
            <Menu className="w-5 h-5" />
          </motion.button>

          {/* XP Bar - Desktop */}
          {profile && (
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-cyan-400 tracking-wider">LV.{profile.level}</span>
                <span className="text-xs text-gray-500">|</span>
                <span className="text-xs text-gray-400">{profile.displayName}</span>
              </div>
              <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${(profile.xp / profile.xpToNextLevel) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' as const }}
                >
                  <div className="absolute inset-0 shimmer" />
                </motion.div>
              </div>
              <span className="text-[10px] text-gray-500">
                {profile.xp.toLocaleString()} / {profile.xpToNextLevel.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <motion.button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              whileTap={{ scale: 0.95 }}
            >
              <Search className="w-5 h-5" />
            </motion.button>
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-[#12121a] border border-white/10 rounded-xl p-3 shadow-2xl"
                >
                  <input
                    type="text"
                    placeholder="Search quests, goals, achievements..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                    autoFocus
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notifications */}
          <div className="relative">
            <motion.button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors relative"
              whileTap={{ scale: 0.95 }}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
                >
                  {unreadCount}
                </motion.span>
              )}
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-96 bg-[#12121a] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 && (
                      <div className="p-4 text-center text-xs text-gray-500">
                        You're all caught up.
                      </div>
                    )}
                    {notifications.map((notif) => {
                      const Icon = iconMap[notif.type] || Star;
                      return (
                        <motion.div
                          key={notif.id}
                          onClick={() => !notif.read && markRead.mutate(notif.id)}
                          className={cn(
                            'flex items-start gap-3 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-0',
                            !notif.read && 'bg-blue-500/5'
                          )}
                          whileHover={{ x: 2 }}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                            !notif.read ? 'bg-blue-500/10 text-blue-400' : 'bg-white/5 text-gray-500'
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{notif.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{notif.message}</p>
                            <p className="text-[10px] text-gray-600 mt-1">{timeAgo(notif.createdAt)}</p>
                          </div>
                          {!notif.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Avatar */}
          <motion.button
            onClick={() => navigate('/profile')}
            className="relative ml-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-blue-500/50 bg-white/5 flex items-center justify-center">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-blue-400">
                  {profile?.displayName?.[0]?.toUpperCase() ?? '?'}
                </span>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050505]" />
          </motion.button>
        </div>
      </div>
    </header>
  );
}
