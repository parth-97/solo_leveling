import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  friendsApi,
  leaderboardApi,
  feedApi,
  groupsApi,
  challengesApi,
} from '@/lib/api/community';
import type {
  LeaderboardParams,
  UpdateGroupRequest,
} from '@/types/api';
import type {
  CreateGroupInput,
  CreateChallengeInput,
  UpdateChallengeProgressInput,
  ReportPeriod,
  PaginationParams,
} from '@/types/shared';
import { useAuth } from '@/contexts/AuthContext';
import { profileKeys } from './useProfile';

export const communityKeys = {
  friends: ['friends'] as const,
  friendRequests: ['friends', 'requests'] as const,
  leaderboard: (params: LeaderboardParams) => ['leaderboard', params] as const,
  friendsLeaderboard: (period: ReportPeriod) => ['leaderboard', 'friends', period] as const,
  feed: (params?: PaginationParams) => ['feed', params ?? {}] as const,
  globalFeed: (params?: PaginationParams) => ['feed', 'global', params ?? {}] as const,
  groups: (params?: PaginationParams) => ['groups', params ?? {}] as const,
  group: (id: string) => ['groups', 'detail', id] as const,
  challenges: (params?: PaginationParams) => ['challenges', params ?? {}] as const,
  challenge: (id: string) => ['challenges', 'detail', id] as const,
};

// ── Friends ─────────────────────────────────────────────────

export function useFriends() {
  const { session } = useAuth();
  return useQuery({ queryKey: communityKeys.friends, queryFn: friendsApi.list, enabled: !!session });
}

export function useFriendRequests() {
  const { session } = useAuth();
  return useQuery({ queryKey: communityKeys.friendRequests, queryFn: friendsApi.requests, enabled: !!session });
}

/**
 * Accepts a username string (what the user types), resolves it to a UUID via
 * GET /api/v1/profile/:username, then POSTs /api/v1/friends/request.
 *
 * This is the fix for the "Failed — check the ID and try again" error that
 * occurred because the old code passed the raw username directly as `addresseeId`,
 * which failed the server-side `z.string().uuid()` validation.
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      // Step 1: resolve username → profile (gets the UUID)
      const profile = await friendsApi.lookupByUsername(username);
      // Step 2: send the friend request using the resolved UUID
      return friendsApi.send({ addresseeId: profile.id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityKeys.friendRequests }),
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => friendsApi.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.friendRequests });
      queryClient.invalidateQueries({ queryKey: communityKeys.friends });
    },
  });
}

export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => friendsApi.decline(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityKeys.friendRequests }),
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => friendsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityKeys.friends }),
  });
}

// ── Leaderboard ─────────────────────────────────────────────

export function useLeaderboard(params: LeaderboardParams) {
  const { session } = useAuth();
  return useQuery({
    queryKey: communityKeys.leaderboard(params),
    queryFn: () => leaderboardApi.get(params),
    enabled: !!session,
  });
}

export function useFriendsLeaderboard(period: ReportPeriod) {
  const { session } = useAuth();
  return useQuery({
    queryKey: communityKeys.friendsLeaderboard(period),
    queryFn: () => leaderboardApi.friends(period),
    enabled: !!session,
  });
}

// ── Activity feed ───────────────────────────────────────────

export function useFeed(params?: PaginationParams) {
  const { session } = useAuth();
  return useQuery({
    queryKey: communityKeys.feed(params),
    queryFn: () => feedApi.mine(params),
    enabled: !!session,
  });
}

export function useGlobalFeed(params?: PaginationParams) {
  const { session } = useAuth();
  return useQuery({
    queryKey: communityKeys.globalFeed(params),
    queryFn: () => feedApi.global(params),
    enabled: !!session,
  });
}

// ── Groups ───────────────────────────────────────────────────

export function useGroups(params?: PaginationParams) {
  const { session } = useAuth();
  return useQuery({ queryKey: communityKeys.groups(params), queryFn: () => groupsApi.list(params), enabled: !!session });
}

export function useGroup(id: string | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: communityKeys.group(id ?? ''),
    queryFn: () => groupsApi.get(id as string),
    enabled: !!session && !!id,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupInput) => groupsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useUpdateGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGroupRequest) => groupsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.group(id) });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupsApi.join(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.group(id) });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupsApi.leave(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.group(id) });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

// ── Challenges ───────────────────────────────────────────────

export function useChallenges(params?: PaginationParams) {
  const { session } = useAuth();
  return useQuery({
    queryKey: communityKeys.challenges(params),
    queryFn: () => challengesApi.list(params),
    enabled: !!session,
  });
}

export function useChallenge(id: string | undefined) {
  const { session } = useAuth();
  return useQuery({
    queryKey: communityKeys.challenge(id ?? ''),
    queryFn: () => challengesApi.get(id as string),
    enabled: !!session && !!id,
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateChallengeInput) => challengesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => challengesApi.join(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: communityKeys.challenge(id) });
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
  });
}

export function useUpdateChallengeProgress(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateChallengeProgressInput) => challengesApi.updateProgress(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityKeys.challenge(id) });
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
    },
  });
}
