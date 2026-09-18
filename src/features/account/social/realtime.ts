"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/infrastructure/env";
import { createBrowserSupabaseClient } from "@/infrastructure/supabase/client";
import { globalEvents } from "@/core/events";
import { SOCIAL_EVENTS } from "@/features/account/constants";
import { useAuth } from "@/features/auth";

export function SocialRealtimeSync() {
  const auth = useAuth();
  const userId = auth.user?.id || null;
  const accessToken = auth.session?.access_token || null;
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured() || !auth.isAuthenticated || !userId) {
      if (channelRef.current) {
        try {
          const supabase = createBrowserSupabaseClient();
          void supabase.removeChannel(channelRef.current);
        } catch {}
        channelRef.current = null;
      }
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      if (accessToken) {
        void supabase.realtime.setAuth(accessToken);
      }

      const channelName = `social:user:${userId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload: Record<string, any>) => {
            globalEvents.emitDebounced(
              SOCIAL_EVENTS.NOTIFICATION_CHANGE,
              payload,
              80,
            );
            const eventType =
              payload.new?.event_type || payload.old?.event_type;
            if (
              eventType === "FOLLOW_REQUEST" ||
              eventType === "FOLLOW_ACCEPTED"
            ) {
              globalEvents.emitDebounced(
                SOCIAL_EVENTS.INBOX_CHANGE,
                undefined,
                80,
              );
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "account_follows",
          },
          (payload: Record<string, any>) => {
            const record =
              payload.new && Object.keys(payload.new).length > 0
                ? payload.new
                : payload.old;
            const followerId = record?.follower_id;
            const followingId = record?.following_id;
            const status =
              payload.eventType === "DELETE" ? null : record?.status;

            if (followingId === userId) {
              globalEvents.emitDebounced(
                SOCIAL_EVENTS.INBOX_CHANGE,
                undefined,
                80,
              );
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followerId,
                followingId,
                status,
              });
            }

            if (followerId === userId) {
              globalEvents.emit(SOCIAL_EVENTS.FOLLOW_CHANGE, {
                followerId,
                followingId,
                status,
              });
            }
          },
        )
        .subscribe();

      channelRef.current = channel;
    } catch (e) {
      console.warn("[SocialRealtimeSync] Could not initialize realtime:", e);
    }

    return () => {
      if (channelRef.current) {
        try {
          const client = createBrowserSupabaseClient();
          void client.removeChannel(channelRef.current);
        } catch {}
        channelRef.current = null;
      }
    };
  }, [accessToken, auth.isAuthenticated, userId]);

  return null;
}
