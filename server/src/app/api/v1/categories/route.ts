import type { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/utils/auth';
import { jsonOk, withErrorHandling } from '@/lib/utils/response';
import { handleOptions } from '@/lib/utils/cors';
import { toCamel } from '@/lib/utils/case';

export const OPTIONS = handleOptions;

/** GET /api/v1/categories — list all categories (system + user-created), sorted. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  return withErrorHandling(origin, async () => {
    const { supabase } = await requireAuth(request);

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, icon_name, color, description')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return jsonOk(toCamel(data ?? []), { origin });
  });
}
