import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Trophy,
  Swords,
  Rss,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  X,
  Check,
  Globe,
  Clock,
  Flame,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import {
  useFriends,
  useFriendRequests,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  useLeaderboard,
  useFeed,
  useGlobalFeed,
  useChallenges,
  useJoinChallenge,
} from '@/hooks/useCommunity';
import { useProfile } from '@/hooks/useProfile';
import { RANKS } from '@/lib/constants';
import type {
  ActivityFeedItem,
  LeaderboardEntry,
  Friendship,
  FriendProfile,
  Challenge,
} from '@/types/shared';

// ── Animation variants ────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

// ── Tab definitions ───────────────────────────────────────────

type Tab = 'feed' | 'leaderboard' | 'squad' | 'challenges';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'feed',        label: 'Activity Feed', icon: <Rss className="w-4 h-4" /> },
  { id: 'leaderboard', label: 'Leaderboard',   icon: <Trophy className="w-4 h-4" /> },
  { id: 'squad',       label: 'Squad',         icon: <Users className="w-4 h-4" /> },
  { id: 'challenges',  label: 'Challenges',    icon: <Swords className="w-4 h-4" /> },
];

// ── Helpers ───────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const onlineColor: Record<string, string> = {
  online:  'bg-emerald-500',
  away:    'bg-amber-400',
  offline: 'bg-gray-600',
};

// ── Sub-components ────────────────────────────────────────────

function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500">
        {icon}
      </div>
      <p className="text-white font-medium">{title}</p>
      <p className="text-gray-500 text-sm max-w-xs">{subtitle}</p>
    </div>
  );
}

// ── Feed tab ──────────────────────────────────────────────────

function FeedTab() {
  const [global, setGlobal] = useState(false);
  const { data: myFeed,     isLoading: myLoading }  = useFeed();
  const { data: globalFeed, isLoading: glLoading }  = useGlobalFeed();

  const isLoading = global ? glLoading : myLoading;
  const feed = (global ? globalFeed?.data : myFeed?.data) ?? [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* Toggle */}
      <motion.div variants={itemVariants} className="flex gap-2">
        {[
          { label: 'Friends', value: false, icon: <Users className="w-3.5 h-3.5" /> },
          { label: 'Global',  value: true,  icon: <Globe className="w-3.5 h-3.5" /> },
        ].map(({ label, value, icon }) => (
          <button
            key={label}
            onClick={() => setGlobal(value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              global === value
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-6 h-6 text-purple-400" /></div>
      ) : feed.length === 0 ? (
        <EmptyState
          icon={<Rss className="w-6 h-6" />}
          title="No activity yet"
          subtitle={global ? 'Be the first to complete a quest or habit!' : 'Add friends to see their activity here.'}
        />
      ) : (
        <div className="space-y-2">
          {feed.map((item: ActivityFeedItem, i: number) => {
            const user = item.user;
            const actionColors: Record<string, string> = {
              completed: 'text-emerald-400',
              achieved:  'text-amber-400',
              leveled_up:'text-purple-400',
              started:   'text-blue-400',
              joined:    'text-cyan-400',
            };
            const action = item.action;
            return (
              <motion.div
                key={item.id ?? i}
                variants={itemVariants}
                className="glass-card rounded-xl p-4 flex items-start gap-3"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {(user?.displayName ?? user?.username ?? '?')[0].toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-semibold">{user?.displayName ?? user?.username ?? 'Hunter'}</span>
                    {' '}
                    <span className={cn('font-medium', actionColors[action] ?? 'text-gray-400')}>{action?.replace('_', ' ')}</span>
                    {' '}
                    <span className="text-gray-300">{item.target ?? ''}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(item.createdAt)}
                    </span>
                    {item.xpEarned > 0 && (
                      <span className="text-xs text-purple-400 font-medium">+{item.xpEarned} XP</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ── Leaderboard tab ───────────────────────────────────────────

function LeaderboardTab() {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const { data: lb, isLoading } = useLeaderboard({ period });
  const entries = lb?.data ?? [];

  const rankBadge = (pos: number) => {
    if (pos === 1) return 'bg-amber-400/20 text-amber-400 border border-amber-400/30';
    if (pos === 2) return 'bg-gray-400/20 text-gray-300 border border-gray-400/30';
    if (pos === 3) return 'bg-orange-700/20 text-orange-400 border border-orange-700/30';
    return 'bg-white/5 text-gray-500 border border-white/5';
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {/* Period selector */}
      <motion.div variants={itemVariants} className="flex gap-2">
        {(['weekly', 'monthly', 'yearly'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all',
              period === p
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            )}
          >
            {p}
          </button>
        ))}
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-6 h-6 text-purple-400" /></div>
      ) : entries.length === 0 ? (
        <EmptyState icon={<Trophy className="w-6 h-6" />} title="No rankings yet" subtitle="Complete quests and habits to earn XP and climb the ranks." />
      ) : (
        <div className="space-y-2">
          {entries.map((entry: LeaderboardEntry, i: number) => {
            const profile = entry.profile;
            const pos = entry.rankPosition ?? i + 1;
            const rankInfo = RANKS[profile.rank];
            return (
              <motion.div
                key={entry.userId ?? i}
                variants={itemVariants}
                className="glass-card rounded-xl p-4 flex items-center gap-4"
              >
                <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0', rankBadge(pos))}>
                  {pos}
                </span>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(profile.displayName ?? profile.username ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {profile.displayName ?? profile.username ?? 'Hunter'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Lv.{profile.level ?? '?'}
                    {rankInfo && <span style={{ color: rankInfo.color }} className="ml-1.5 font-medium">{rankInfo.label}</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-purple-400">{entry.xpEarned.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">XP</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ── Squad tab ─────────────────────────────────────────────────

function SquadTab() {
  const [showAddHunter, setShowAddHunter] = useState(false);
  const [searchInput, setSearchInput]     = useState('');
  const [addError, setAddError]           = useState('');

  const { data: friends,  isLoading: friendsLoading }  = useFriends();
  const { data: requests, isLoading: requestsLoading } = useFriendRequests();

  const sendFriendRequest   = useSendFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();
  const declineFriendRequest = useDeclineFriendRequest();
  const removeFriend        = useRemoveFriend();

  const friendList   = friends   ?? [];
  const requestList  = requests  ?? [];
  const incomingReqs = requestList.filter(
    (r) => r.status === 'pending'
  );

  const handleSend = () => {
    if (!searchInput.trim()) return;
    setAddError('');
    sendFriendRequest.mutate(searchInput.trim(), {
      onSuccess: () => {
        setSearchInput('');
        setShowAddHunter(false);
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed — check the username and try again.';
        setAddError(msg);
      },
    });
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">

      {/* Incoming friend requests */}
      {requestsLoading ? null : incomingReqs.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-purple-400" />
            Pending Requests
            <span className="ml-auto bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
              {incomingReqs.length}
            </span>
          </p>
          {incomingReqs.map((req: Friendship) => {
            const requester = req.requester;
            return (
              <div key={req.id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {(requester?.displayName ?? requester?.username ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {requester?.displayName ?? requester?.username ?? 'Hunter'}
                  </p>
                  <p className="text-xs text-gray-500">Lv.{requester?.level ?? '?'}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptFriendRequest.mutate(req.id)}
                    className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 flex items-center justify-center transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => declineFriendRequest.mutate(req.id)}
                    className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/40 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Your Squad */}
      <motion.div variants={itemVariants} className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-white">Your Squad</p>
            <p className="text-xs text-gray-500">
              {friendList.length} hunter{friendList.length !== 1 ? 's' : ''} with you
            </p>
          </div>
          <button
            onClick={() => { setShowAddHunter(true); setAddError(''); setSearchInput(''); }}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Hunter
          </button>
        </div>

        {/* Add Hunter panel */}
        <AnimatePresence>
          {showAddHunter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="bg-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">Add a Hunter</p>
                  <button onClick={() => setShowAddHunter(false)} className="text-gray-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">Enter their username to send a squad invite.</p>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => { setSearchInput(e.target.value); setAddError(''); }}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Enter username"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={sendFriendRequest.isPending || !searchInput.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    {sendFriendRequest.isPending ? <Spinner className="w-4 h-4" /> : 'Send'}
                  </button>
                </div>
                {addError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <X className="w-3 h-3" /> {addError}
                  </p>
                )}
                {sendFriendRequest.isSuccess && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Friend request sent!
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {friendsLoading ? (
          <div className="flex justify-center py-10"><Spinner className="w-5 h-5 text-purple-400" /></div>
        ) : friendList.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
            title="Your squad is empty."
            subtitle="Add friends to build your raid party."
          />
        ) : (
          <div className="space-y-3">
            {friendList.map((friend: FriendProfile) => {
              const status = friend.onlineStatus;
              const rankInfo = RANKS[friend.rank];
              return (
                <div key={friend.friendshipId} className="flex items-center gap-3 group">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {(friend.displayName ?? friend.username ?? '?')[0].toUpperCase()}
                    </div>
                    <span className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d0d14]', onlineColor[status])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {friend.displayName ?? friend.username ?? 'Hunter'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Lv.{friend.level ?? '?'}
                      {rankInfo && <span style={{ color: rankInfo.color }} className="ml-1.5">{rankInfo.label}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs capitalize', status === 'online' ? 'text-emerald-400' : 'text-gray-600')}>
                      {status}
                    </span>
                    <button
                      onClick={() => removeFriend.mutate(friend.friendshipId)}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-red-600/10 text-red-500 hover:bg-red-600/30 flex items-center justify-center transition-all"
                      title="Remove friend"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Challenges tab ────────────────────────────────────────────

const DIFFICULTY_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  easy:      { label: 'Easy',      color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  normal:    { label: 'Normal',    color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  hard:      { label: 'Hard',      color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  elite:     { label: 'Elite',     color: 'text-orange-500',  bg: 'bg-orange-500/10' },
  legendary: { label: 'Legendary', color: 'text-purple-400',  bg: 'bg-purple-400/10' },
};

function ChallengesTab() {
  const { data: challengesRes, isLoading } = useChallenges();
  const joinChallenge = useJoinChallenge();
  const challenges = challengesRes?.data ?? [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-6 h-6 text-purple-400" /></div>
      ) : challenges.length === 0 ? (
        <EmptyState
          icon={<Swords className="w-6 h-6" />}
          title="No active challenges"
          subtitle="Check back later or create your own challenge."
        />
      ) : (
        challenges.map((challenge: Challenge) => {
          const diff = DIFFICULTY_STYLES[challenge.difficulty] ?? DIFFICULTY_STYLES.normal;
          const hasJoined = !!challenge.userParticipant;
          const participantCount = challenge.participantCount ?? 0;
          const maxParticipants = challenge.maxParticipants;

          const endDate = challenge.endDate ? new Date(challenge.endDate) : null;
          const daysLeft = endDate
            ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86_400_000))
            : null;

          return (
            <motion.div key={challenge.id} variants={itemVariants} className="glass-card rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', diff.color, diff.bg)}>
                      {diff.label}
                    </span>
                    {daysLeft !== null && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-400" />
                        {daysLeft}d left
                      </span>
                    )}
                  </div>
                  <p className="text-white font-semibold truncate">{challenge.title}</p>
                  {challenge.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{challenge.description}</p>
                  )}
                </div>
                {challenge.xpReward > 0 && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-purple-400">+{challenge.xpReward.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">XP</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {participantCount}{maxParticipants ? `/${maxParticipants}` : ''} hunters
                </span>
                {hasJoined ? (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <UserCheck className="w-3.5 h-3.5" /> Joined
                  </span>
                ) : (
                  <button
                    onClick={() => joinChallenge.mutate(challenge.id)}
                    disabled={joinChallenge.isPending}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                    Join Challenge
                  </button>
                )}
              </div>

              {/* Progress bar if joined */}
              {hasJoined && challenge.userParticipant && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Your progress</span>
                    <span>{challenge.userParticipant.progress ?? 0}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all"
                      style={{ width: `${challenge.userParticipant.progress ?? 0}%` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function Community() {
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const { data: profile } = useProfile();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-3xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Community</h1>
          <p className="text-sm text-gray-500 mt-1">Connect with fellow hunters</p>
        </div>
        {profile && (
          <div className="flex items-center gap-2 bg-[#12121a] rounded-xl px-4 py-2 border border-white/5 self-start">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-white font-medium">{profile.displayName ?? profile.username}</span>
          </div>
        )}
      </motion.div>

      {/* Tab bar */}
      <motion.div variants={itemVariants} className="flex gap-1 bg-[#12121a] rounded-xl p-1 border border-white/5 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'feed'        && <FeedTab />}
          {activeTab === 'leaderboard' && <LeaderboardTab />}
          {activeTab === 'squad'       && <SquadTab />}
          {activeTab === 'challenges'  && <ChallengesTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
