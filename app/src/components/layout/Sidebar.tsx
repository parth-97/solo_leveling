import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Swords,
  Target,
  Flame,
  BarChart3,
  Trophy,
  Users,
  UserCircle,
  Settings,
  LogOut,
  Hexagon,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems: { path: string; label: string; icon: LucideIcon }[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/quests', label: 'Quests', icon: Swords },
  { path: '/goals', label: 'Goals', icon: Target },
  { path: '/habits', label: 'Habits', icon: Flame },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/achievements', label: 'Achievements', icon: Trophy },
  { path: '/community', label: 'Community', icon: Users },
  { path: '/profile', label: 'Profile', icon: UserCircle },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[260px] bg-[#0a0a0f]/95 backdrop-blur-xl border-r border-white/5',
          'lg:translate-x-0 lg:static lg:z-0 transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <button
              onClick={() => handleNavigation('/dashboard')}
              className="flex items-center gap-3 group"
            >
              <div className="relative">
                <Hexagon className="w-8 h-8 text-blue-500 group-hover:text-blue-400 transition-colors" />
                <div className="absolute inset-0 w-8 h-8 bg-blue-500/20 blur-lg rounded-full" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-[0.2em] text-white">SOLO</h1>
                <h1 className="text-[10px] font-semibold tracking-[0.3em] text-blue-400">LEVELING</h1>
              </div>
            </button>
            <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <motion.button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <item.icon className={cn('w-5 h-5', isActive && 'text-blue-400')} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400"
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-3 border-t border-white/5 space-y-1">
            <motion.button
              onClick={() => handleNavigation('/settings')}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                location.pathname === '/settings'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
              whileHover={{ x: 4 }}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </motion.button>
            <motion.button
              onClick={async () => {
                await signOut();
                navigate('/landing');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all"
              whileHover={{ x: 4 }}
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </motion.button>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
