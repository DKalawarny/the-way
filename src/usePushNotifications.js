/**
 * usePushNotifications
 *
 * Requests browser Notification permission once, then listens on the
 * Supabase Realtime postgres_changes channel for new notifications
 * addressed to the current user. When a new row lands, it fires an
 * OS-level browser notification — even when the app is in a background tab.
 *
 * No VAPID keys, no service-worker push, no extra npm packages required.
 * Works on Chrome, Firefox, Edge, and Safari 16.4+.
 *
 * For true "app closed" push (iOS home screen, Android PWA), you would
 * need VAPID web-push — this hook gracefully falls back to no-op in those
 * environments since `Notification` may be undefined.
 */

import { useEffect, useRef } from 'react';
import { supabase } from './supabase.js';

// Human-readable titles for each notification kind.
const KIND_TITLES = {
  prayer_support:          '🙏 Someone is praying for you',
  post_comment:            '💬 New comment on your post',
  post_comment_reply:      '↩ Someone replied to your comment',
  post_reaction:           '❤️ Someone reacted to your post',
  friend_request_received: '👋 You have a new friend request',
  friend_request_accepted: '🤝 Your friend request was accepted',
  follow:                  '👤 Someone started following you',
  role_assigned:           '🎖 You received a new role',
  dm_message:              '✉ You have a new direct message',
  care_message:            '💙 You have a new care message',
  sermon_published:        '📖 A new sermon has been published',
};

function notifTitle(kind) {
  return KIND_TITLES[kind] ?? 'New notification — kinwove';
}

// Quietly request permission without bothering the user more than once.
// We call this on first interaction rather than on page load so browsers
// don't block the permission prompt for "not triggered by user gesture".
let permissionRequested = false;
export function requestNotificationPermission() {
  if (permissionRequested) return;
  permissionRequested = true;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

export function usePushNotifications(userId) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    if (!('Notification' in window)) return;

    // Subscribe to INSERT events on the notifications table for this user
    const channel = supabase
      .channel(`push-notifs:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          if (Notification.permission !== 'granted') return;
          const n = payload.new;
          const title = notifTitle(n.kind);
          const snippet = n.data?.snippet;
          const body = snippet ? `"${snippet.slice(0, 100)}"` : '';

          try {
            const notif = new Notification(title, {
              body,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: n.id,       // deduplicates if same row fires twice
              silent: false,
            });
            // Auto-close after 6s so it doesn't pile up on desktop
            setTimeout(() => notif.close(), 6000);
          } catch {
            // Safari 16 sometimes throws on Notification constructor — safe to ignore
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId]);
}
