import { useEffect } from "react";
import { AppState } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeAppChanges, type AppChangeKind } from "@startup/data-access";
import { useToast } from "@startup/mobile-ui";
import { mobileSession, supabase } from "./supabase";

const queryKeys: Partial<Record<AppChangeKind, string[]>> = {
  appointments: ["doctor-clinic-appointments", "doctor-clinic-sessions"],
  notifications: ["my-notifications"],
  schedule: [
    "my-practices",
    "my-doctor-profile",
    "my-doctor-facility-requests",
    "my-doctor-schedule",
    "doctor-clinic-sessions",
    "doctor-daily-slot-usage",
    "doctor-clinic-unavailability",
  ],
  profile: [
    "my-doctor-profile",
    "doctor-verification",
    "my-practices",
    "my-doctor-facility-requests",
  ],
  clinical: ["doctor-clinic-appointments"],
};

export function LiveUpdatesBridge({ identityId }: { identityId?: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  useEffect(() => {
    if (!supabase || !identityId) return;
    let active = true;
    let queued = false;
    let catchUp = false;
    let sessionRefreshing = false;
    let sessionAgain = false;
    let warned = false;
    const pending = new Set<AppChangeKind>();
    const refresh = (kind?: AppChangeKind) => {
      if (!active) return;
      if (kind) pending.add(kind);
      else catchUp = true;
      if (AppState.currentState !== "active" || queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (!active || AppState.currentState !== "active") return;
        const refreshProfile = catchUp || pending.has("profile");
        if (catchUp)
          void queryClient.invalidateQueries({}, { cancelRefetch: true });
        else {
          const affected = new Set(
            [...pending].flatMap((change) => queryKeys[change] ?? [])
          );
          for (const key of affected)
            void queryClient.invalidateQueries(
              { queryKey: [key] },
              { cancelRefetch: true }
            );
        }
        pending.clear();
        catchUp = false;
        if (refreshProfile) {
          sessionAgain = true;
          if (!sessionRefreshing) {
            sessionRefreshing = true;
            void (async () => {
              try {
                while (
                  active &&
                  sessionAgain &&
                  AppState.currentState === "active"
                ) {
                  sessionAgain = false;
                  await mobileSession.refresh();
                }
              } finally {
                sessionRefreshing = false;
              }
            })();
          }
        }
      });
    };
    const cleanup = subscribeAppChanges(
      supabase,
      { identityId, directory: false },
      {
        onChange: (change) => refresh(change.kind),
        onConnected: () => {
          warned = false;
          refresh();
        },
        onError: () => {
          if (active && !warned && AppState.currentState === "active") {
            warned = true;
            showToast({
              title: "Live updates disconnected",
              message: "Updates will catch up when the connection returns.",
              type: "info",
            });
          }
        },
      }
    );
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      active = false;
      cleanup();
      appState.remove();
    };
  }, [identityId, queryClient, showToast]);
  return null;
}
