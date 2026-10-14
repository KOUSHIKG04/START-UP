import type { RealtimeChannel } from "@supabase/supabase-js";
import { uuidSchema } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export type AppChangeKind = "appointments" | "notifications" | "beds" | "ambulance" | "tracking" | "schedule" | "directory" | "profile" | "clinical";
export type AppLiveChange = { kind: AppChangeKind; topic: string };
type Listener = { onChange: (change: AppLiveChange) => void; onConnected?: (topic: string) => void; onError?: () => void };
type Entry = { listeners: Set<Listener>; channel?: RealtimeChannel; connected: boolean; warned: boolean };
const clients = new WeakMap<AppSupabaseClient, Map<string, Entry>>();
const closing = new WeakMap<AppSupabaseClient, Map<string, Promise<void>>>();
const kinds = new Set<AppChangeKind>(["appointments", "notifications", "beds", "ambulance", "tracking", "schedule", "directory", "profile", "clinical"]);

/** Reuse one private channel per topic/client, including overlapping screen subscribers. */
export function subscribeAppChanges(client: AppSupabaseClient,
  scope: { identityId?: string; facilityIds?: string[]; directory?: boolean }, listener: Listener) {
  const topics = new Set<string>();
  if (scope.identityId) topics.add(`identity-events:${uuidSchema.parse(scope.identityId)}`);
  for (const id of scope.facilityIds ?? []) topics.add(`facility-events:${uuidSchema.parse(id)}`);
  if (scope.directory) topics.add("directory-events");
  let entries = clients.get(client);
  if (!entries) { entries = new Map(); clients.set(client, entries); }
  let closingTopics = closing.get(client);
  if (!closingTopics) { closingTopics = new Map(); closing.set(client, closingTopics); }
  const attached: [string, Entry][] = [];
  for (const topic of topics) {
    let entry = entries.get(topic);
    if (!entry) {
      entry = { listeners: new Set(), connected: false, warned: false };
      entries.set(topic, entry);
      const current = entry;
      void Promise.resolve(closingTopics.get(topic)).then(() => client.realtime.setAuth()).then(() => {
        if (!current.listeners.size) return;
        current.channel = client.channel(topic, { config: { private: true } })
          .on("broadcast", { event: "app_changed" }, event => {
            const kind = event.payload?.kind as AppChangeKind;
            if (!kinds.has(kind)) return;
            for (const target of current.listeners) target.onChange({ kind, topic });
          }).subscribe(status => {
            if (status === "SUBSCRIBED") {
              current.connected = true; current.warned = false;
              for (const target of current.listeners) target.onConnected?.(topic);
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
              current.connected = false;
              if (!current.warned) { current.warned = true; for (const target of current.listeners) target.onError?.(); }
            }
          });
      }).catch(() => { for (const target of current.listeners) target.onError?.(); });
    }
    entry.listeners.add(listener); attached.push([topic, entry]);
    if (entry.connected) queueMicrotask(() => { if (entry?.listeners.has(listener)) listener.onConnected?.(topic); });
  }
  return () => {
    for (const [topic, entry] of attached) {
      entry.listeners.delete(listener);
      if (!entry.listeners.size) {
        entries!.delete(topic);
        if (entry.channel) {
          entry.connected = false;
          const removed = client.removeChannel(entry.channel).then(() => undefined).catch(() => undefined);
          closingTopics!.set(topic, removed);
          void removed.then(() => { if (closingTopics!.get(topic) === removed) closingTopics!.delete(topic); });
        }
      }
    }
  };
}
