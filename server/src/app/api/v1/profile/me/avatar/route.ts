import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';

export const OPTIONS = handleOptions;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const AVATAR_BUCKET = 'avatars';

/**
 * POST /api/v1/profile/me/avatar — multipart/form-data upload, field name `avatar`.
 *
 * Requires a Supabase Storage bucket named `avatars` (public read) to
 * exist — this is infrastructure setup outside the SQL migrations
 * provided, and is documented here as a deployment prerequisite.
 *
 * Uploads to `avatars/{userId}/{timestamp}.{ext}`, then updates
 * `profiles.avatar_url` to the public URL.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);

    const formData = await request.formData().catch(() => null);
    if (!formData) throw new ApiException('BAD_REQUEST', 'Expected multipart/form-data body.');

    const file = formData.get('avatar');
    if (!(file instanceof File)) {
      throw new ApiException('VALIDATION_ERROR', 'Missing "avatar" file field.');
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      throw new ApiException('VALIDATION_ERROR', 'Unsupported file type. Use PNG, JPEG, WEBP, or GIF.');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new ApiException('VALIDATION_ERROR', 'File too large. Maximum size is 5MB.');
    }

    const ext = file.name.split('.').pop() || 'png';
    const path = `${userId}/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, arrayBuffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      throw new ApiException('INTERNAL_ERROR', `Avatar upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const avatarUrl = publicUrlData.publicUrl;

    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
    if (updateError) throw new ApiException('INTERNAL_ERROR', 'Failed to save avatar URL.');

    return jsonOk({ avatarUrl }, { origin });
  });
}
