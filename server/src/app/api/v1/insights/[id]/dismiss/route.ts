import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling, ApiException } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

type Params = { params: Promise<{ id: string }> };

/** POST /api/v1/insights/:id/dismiss */
export async function POST(request: NextRequest, { params }: Params) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { userId, supabase } = await requireAuth(request);
    const { id } = await params;

    const { data, error } = await supabase
      .from('ai_insights')
      .update({ dismissed: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) throw new ApiException('NOT_FOUND', 'Insight not found.');

    return jsonOk(toCamel(data), { origin });
  });
}
