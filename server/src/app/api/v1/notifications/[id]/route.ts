import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** DELETE /api/v1/notifications/:id */
export async function DELETE(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { error, data: deleted } = await supabase.from('notifications').delete().eq('id', id).eq('user_id', userId).select('id');
    const count = deleted?.length ?? 0;
    if (error) throw new ApiException('INTERNAL_ERROR', 'Failed to delete notification.');
    if (!count) throw new ApiException('NOT_FOUND', 'Notification not found.');

    return jsonOk({ id }, { origin });
  });
}
