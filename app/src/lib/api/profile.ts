import { apiFetch, apiFetchData } from './client';
import type {
  UpdateProfileInput,
} from '@/types/shared';
import type {
  GetMyProfileResponse,
  UpdateMyProfileResponse,
  ProfileStats,
  UploadAvatarResponse,
  CompleteOnboardingInput,
  CompleteOnboardingResponse,
  GetPublicProfileResponse,
} from '@/types/api';

export const profileApi = {
  /** GET /api/v1/profile/me */
  getMe: () => apiFetchData<GetMyProfileResponse['data']>('/profile/me'),

  /** PATCH /api/v1/profile/me */
  updateMe: (input: UpdateProfileInput) =>
    apiFetchData<UpdateMyProfileResponse['data']>('/profile/me', { method: 'PATCH', body: input }),

  /** GET /api/v1/profile/:username */
  getPublic: (username: string) =>
    apiFetchData<GetPublicProfileResponse['data']>(`/profile/${username}`),

  /** GET /api/v1/profile/me/stats */
  getMyStats: () => apiFetchData<ProfileStats>('/profile/me/stats'),

  /** POST /api/v1/profile/me/avatar (multipart/form-data) */
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return apiFetchData<UploadAvatarResponse['data']>('/profile/me/avatar', {
      method: 'POST',
      body: form,
      isFormData: true,
    });
  },

  /** POST /api/v1/onboarding/complete */
  completeOnboarding: (input: CompleteOnboardingInput) =>
    apiFetchData<CompleteOnboardingResponse['data']>('/onboarding/complete', {
      method: 'POST',
      body: input,
    }),

  /**
   * POST /api/v1/profile/me/reset
   * Wipes all gameplay progress (XP, level, rank, streaks, habits, goals,
   * achievements, quest completions) and returns the reset profile.
   */
  resetProfile: () =>
    apiFetchData<GetMyProfileResponse['data']>('/profile/me/reset', {
      method: 'POST',
    }),
};

// Re-export for callers that want the raw envelope (with meta).
export { apiFetch };
