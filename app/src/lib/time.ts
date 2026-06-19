// app/src/lib/time.ts
// Timestamp formatting utilities.
// Fields that were pre-formatted display strings in mockData are now
// ISO timestamps from the API. Use these helpers to convert them.
//
// Affected fields:
//   Notification.createdAt  (was .time: "2 hours ago")
//   ActivityFeedItem.createdAt  (was .time: "5 min ago")
//   FriendProfile.lastActiveAt  (was .lastActive: "Online")

import { formatDistanceToNow, format, isValid, parseISO } from 'date-fns';

/**
 * Converts an ISO timestamp to a human-readable relative time string.
 * e.g. "2 hours ago", "3 days ago"
 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const date = parseISO(iso);
  if (!isValid(date)) return 'Unknown';
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Formats an ISO timestamp as a short date.
 * e.g. "Jun 16, 2026"
 */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = parseISO(iso);
  if (!isValid(date)) return '—';
  return format(date, 'MMM d, yyyy');
}

/**
 * Formats an ISO timestamp as a full date + time.
 * e.g. "Jun 16, 2026 at 4:30 PM"
 */
export function fullDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = parseISO(iso);
  if (!isValid(date)) return '—';
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

/**
 * Returns an online status string from lastActiveAt.
 * "Online" if within 5 min, otherwise timeAgo.
 */
export function onlineLabel(lastActiveAt: string | null): string {
  if (!lastActiveAt) return 'Offline';
  const date = parseISO(lastActiveAt);
  if (!isValid(date)) return 'Offline';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 5 * 60 * 1000) return 'Online';
  if (diffMs < 30 * 60 * 1000) return 'Away';
  return timeAgo(lastActiveAt);
}
