import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/v1/notifications/:id/read — mark a single notification as read. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) throw new ApiException('NOT_FOUND', 'Notification not found.');

    return jsonOk(toCamel(data), { origin });
  });
}
