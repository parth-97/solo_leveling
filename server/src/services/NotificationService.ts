import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationType } from '@/types/shared';

interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Inserts a notification row for a user. Per files/05_api_and_services.ts,
 * push/email delivery would be triggered here based on the user's
 * `push_notifications` / `email_notifications` preferences — those
 * external integrations (web push / Resend) are out of scope for this
 * implementation and are left as a documented extension point.
 */
export async function sendNotification(supabase: SupabaseClient, userId: string, notification: NotificationInput): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: notification.data ?? {},
  });

  // Push/email delivery extension point:
  // const { data: profile } = await supabase.from('profiles')
  //   .select('push_notifications, email_notifications').eq('id', userId).single();
  // if (profile?.push_notifications) { /* send push */ }
  // if (profile?.email_notifications) { /* send email via Resend */ }
}
