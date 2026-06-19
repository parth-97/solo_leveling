import { apiFetch, apiFetchData } from './client';
import type { CreateGroupInput, CreateChallengeInput, UpdateChallengeProgressInput } from '@/types/shared';
import type {
  ListFriendsResponse,
  ListFriendRequestsResponse,
  SendFriendRequestInput,
  SendFriendRequestResponse,
  AcceptFriendRequestResponse,
  DeclineFriendRequestResponse,
  RemoveFriendResponse,
  GetLeaderboardResponse,
  LeaderboardParams,
  GetFriendsLeaderboardResponse,
  GetFeedResponse,
  GetGlobalFeedResponse,
  ListGroupsResponse,
  CreateGroupResponse,
  GetGroupResponse,
  UpdateGroupRequest,
  UpdateGroupResponse,
  DeleteGroupResponse,
  JoinGroupResponse,
  LeaveGroupResponse,
  KickMemberResponse,
  ListChallengesResponse,
  CreateChallengeResponse,
  GetChallengeResponse,
  JoinChallengeResponse,
  UpdateChallengeProgressResponse,
  GetChallengeLeaderboardResponse,
} from '@/types/api';
import type { ReportPeriod, PaginationParams } from '@/types/shared';

export interface HunterProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  rank: string;
  level: number;
}

export const friendsApi = {
  /** GET /api/v1/friends */
  list: () => apiFetchData<ListFriendsResponse['data']>('/friends'),

  /** GET /api/v1/friends/requests */
  requests: () => apiFetchData<ListFriendRequestsResponse['data']>('/friends/requests'),

  /** POST /api/v1/friends/request */
  send: (input: SendFriendRequestInput) =>
    apiFetchData<SendFriendRequestResponse['data']>('/friends/request', { method: 'POST', body: input }),

  /** POST /api/v1/friends/accept/:id */
  accept: (id: string) =>
    apiFetchData<AcceptFriendRequestResponse['data']>(`/friends/accept/${id}`, { method: 'POST' }),

  /** POST /api/v1/friends/decline/:id */
  decline: (id: string) =>
    apiFetchData<DeclineFriendRequestResponse['data']>(`/friends/decline/${id}`, { method: 'POST' }),

  /** DELETE /api/v1/friends/:id */
  remove: (id: string) =>
    apiFetchData<RemoveFriendResponse['data']>(`/friends/${id}`, { method: 'DELETE' }),

  /**
   * GET /api/v1/profile/:username
   * Resolves a username to a full hunter profile (including UUID).
   * Use this before calling `send` — the backend requires an addresseeId UUID,
   * not a username string.
   */
  lookupByUsername: (username: string) =>
    apiFetchData<HunterProfile>(`/profile/${encodeURIComponent(username.trim())}`),
};

export const leaderboardApi = {
  /** GET /api/v1/leaderboard?period= */
  get: (params: LeaderboardParams) =>
    apiFetch<GetLeaderboardResponse>("/leaderboard", { params: { ...params } as Record<string, string | number | boolean | undefined | null> }),

  /** GET /api/v1/leaderboard/friends?period= */
  friends: (period: ReportPeriod) =>
    apiFetchData<GetFriendsLeaderboardResponse['data']>('/leaderboard/friends', { params: { period } }),
};

export const feedApi = {
  /** GET /api/v1/feed */
  mine: (params?: PaginationParams) =>
    apiFetch<GetFeedResponse>('/feed', { params: params as Record<string, string | number | undefined> }),

  /** GET /api/v1/feed/global */
  global: (params?: PaginationParams) =>
    apiFetch<GetGlobalFeedResponse>('/feed/global', { params: params as Record<string, string | number | undefined> }),
};

export const groupsApi = {
  /** GET /api/v1/groups */
  list: (params?: PaginationParams) =>
    apiFetch<ListGroupsResponse>('/groups', { params: params as Record<string, string | number | undefined> }),

  /** POST /api/v1/groups */
  create: (input: CreateGroupInput) =>
    apiFetchData<CreateGroupResponse['data']>('/groups', { method: 'POST', body: input }),

  /** GET /api/v1/groups/:id */
  get: (id: string) => apiFetchData<GetGroupResponse['data']>(`/groups/${id}`),

  /** PATCH /api/v1/groups/:id */
  update: (id: string, input: UpdateGroupRequest) =>
    apiFetchData<UpdateGroupResponse['data']>(`/groups/${id}`, { method: 'PATCH', body: input }),

  /** DELETE /api/v1/groups/:id */
  remove: (id: string) =>
    apiFetchData<DeleteGroupResponse['data']>(`/groups/${id}`, { method: 'DELETE' }),

  /** POST /api/v1/groups/:id/join */
  join: (id: string) =>
    apiFetchData<JoinGroupResponse['data']>(`/groups/${id}/join`, { method: 'POST' }),

  /** POST /api/v1/groups/:id/leave */
  leave: (id: string) =>
    apiFetchData<LeaveGroupResponse['data']>(`/groups/${id}/leave`, { method: 'POST' }),

  /** DELETE /api/v1/groups/:id/members/:uid */
  kickMember: (id: string, userId: string) =>
    apiFetchData<KickMemberResponse['data']>(`/groups/${id}/members/${userId}`, { method: 'DELETE' }),
};

export const challengesApi = {
  /** GET /api/v1/challenges */
  list: (params?: PaginationParams) =>
    apiFetch<ListChallengesResponse>('/challenges', { params: params as Record<string, string | number | undefined> }),

  /** POST /api/v1/challenges */
  create: (input: CreateChallengeInput) =>
    apiFetchData<CreateChallengeResponse['data']>('/challenges', { method: 'POST', body: input }),

  /** GET /api/v1/challenges/:id */
  get: (id: string) => apiFetchData<GetChallengeResponse['data']>(`/challenges/${id}`),

  /** POST /api/v1/challenges/:id/join */
  join: (id: string) =>
    apiFetchData<JoinChallengeResponse['data']>(`/challenges/${id}/join`, { method: 'POST' }),

  /** PATCH /api/v1/challenges/:id/progress */
  updateProgress: (id: string, input: UpdateChallengeProgressInput) =>
    apiFetchData<UpdateChallengeProgressResponse['data']>(`/challenges/${id}/progress`, {
      method: 'PATCH',
      body: input,
    }),

  /** GET /api/v1/challenges/:id/leaderboard */
  leaderboard: (id: string, params?: PaginationParams) =>
    apiFetch<GetChallengeLeaderboardResponse>(`/challenges/${id}/leaderboard`, {
      params: params as Record<string, string | number | undefined>,
    }),
};
