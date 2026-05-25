import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { realtimeEventSchema, type RealtimeEvent } from "@mates/shared";
import { appConfig } from "@/shared/config";
import { useAuthStore } from "@/infrastructure/storage/auth-store";

const reconnectDelayMs = 1_500;

export function useRealtimeUpdates() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  useEffect(() => {
    if (!hasHydrated || token === null) {
      return;
    }

    const authToken = token;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    function clearReconnectTimer() {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    function scheduleReconnect() {
      if (disposed || reconnectTimer !== null) {
        return;
      }

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, reconnectDelayMs);
    }

    function handleEvent(event: RealtimeEvent) {
      if (event.type === "friend.request.created" || event.type === "friend.request.accepted") {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["friends"] }),
          queryClient.invalidateQueries({ queryKey: ["friends", "requests", "received"] }),
          queryClient.invalidateQueries({ queryKey: ["friends", "requests", "sent"] })
        ]);
        return;
      }

      if (event.type === "invitation.created" || event.type === "invitation.cancelled") {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["invitations", event.invitationId] }),
          queryClient.invalidateQueries({ queryKey: ["invitations", "received"] }),
          queryClient.invalidateQueries({ queryKey: ["invitations", "created"] }),
          queryClient.invalidateQueries({ queryKey: ["invitations", "created", "active"] })
        ]);
        return;
      }

      if (event.type === "invitation.response.updated") {
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["invitations", event.invitationId] }),
          queryClient.invalidateQueries({ queryKey: ["invitations", "created"] }),
          queryClient.invalidateQueries({ queryKey: ["invitations", "created", "active"] })
        ]);
      }
    }

    function connect() {
      if (disposed) {
        return;
      }

      clearReconnectTimer();
      socket = new WebSocket(buildRealtimeUrl(appConfig.apiUrl, authToken));

      socket.onmessage = (message) => {
        if (typeof message.data !== "string") {
          return;
        }

        try {
          const rawPayload = JSON.parse(message.data) as unknown;
          const parsed = realtimeEventSchema.safeParse(rawPayload);
          if (parsed.success) {
            handleEvent(parsed.data);
          }
        } catch (error) {
          console.warn("Failed to parse realtime event", error);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        socket = null;
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      socket?.close();
    };
  }, [hasHydrated, queryClient, token]);
}

function buildRealtimeUrl(apiUrl: string, token: string): string {
  const url = new URL(apiUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/realtime";
  url.search = "";
  url.searchParams.set("token", token);
  return url.toString();
}
