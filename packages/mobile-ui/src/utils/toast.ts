import { toastTokens } from "@startup/design-tokens";
import type {
  Note,
  StackSlot,
  ToastClock,
  ToastInput,
  ToastPosition,
  ToastState,
} from "../types/toast";

export const LINE_HEIGHT = toastTokens.minHeight;

export const toastPositions = [
  "top-start",
  "top-center",
  "top-end",
  "bottom-start",
  "bottom-center",
  "bottom-end",
] as const satisfies readonly ToastPosition[];

type ToastEvent =
  { kind: "show"; note: Note } | { kind: "dismiss"; id?: string };

const listeners = new Set<(event: ToastEvent) => void>();

let nextId = 0;

export function toast(input: string | ToastInput): string {
  const detail = typeof input === "string" ? { message: input } : input;
  const note: Note = { ...detail, id: detail.id ?? `toast-${++nextId}` };
  for (const listener of listeners) listener({ kind: "show", note });
  return note.id;
}

/** Omitting an ID retains the existing mobile dismiss-all behavior. */
export function dismissToast(id?: string) {
  for (const listener of listeners) listener({ kind: "dismiss", id });
}

export function subscribeToasts(listener: (event: ToastEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function upsertToast(notes: readonly Note[], note: Note): Note[] {
  const index = notes.findIndex((item) => item.id === note.id);
  if (index < 0) return [note, ...notes];
  return notes.map((item) => (item.id === note.id ? note : item));
}

export function dismissDelay(
  _state: ToastState | undefined,
  _hasAction: boolean,
  lifetime?: number,
  _hasDetail = false
): number | null {
  if (lifetime === Infinity) return null;
  if (lifetime !== undefined && Number.isFinite(lifetime))
    return Math.max(0, lifetime);
  return 5000;
}

export function tick(clock: ToastClock, at: number) {
  if (clock.since === null) return;
  const elapsed = Math.max(0, at - clock.since);
  clock.since = at;
  for (const [id, left] of clock.waits)
    clock.waits.set(id, Math.max(0, left - elapsed));
}

export function pileSlot(index: number): StackSlot {
  const depth = Math.min(index, toastTokens.depth - 1);
  return {
    y: depth * toastTokens.peek,
    scale: 1 - depth * toastTokens.shrink,
    opacity: index < toastTokens.depth ? 1 - depth * toastTokens.fade : 0,
  };
}

export function fanSlot(index: number, heights: readonly number[]): StackSlot {
  let y = 0;
  for (let at = 0; at < index; at++)
    y += (heights[at] ?? LINE_HEIGHT) + toastTokens.gap;
  return { y, scale: 1, opacity: 1 };
}

export function toastCopy(note: ToastInput) {
  return {
    title: note.title ?? note.message,
    description: note.description ?? (note.title ? note.message : undefined),
  };
}

/** One clock per mounted host; no timers or patient feedback survive an unmount. */
export function createToastStore(now: () => number = nativeNow) {
  const clock: ToastClock = { waits: new Map(), since: now() };
  const subscribers = new Set<() => void>();
  let notes: Note[] = [];
  let snapshot = { notes, paused: false };
  let issued: string | null = null;
  const publish = () => {
    snapshot = { notes, paused: clock.since === null };
    for (const listener of subscribers) listener();
  };
  const dismiss = (id?: string) => {
    if (id) {
      clock.waits.delete(id);
      notes = notes.filter((note) => note.id !== id);
    } else {
      notes = [];
      clock.waits.clear();
    }
    publish();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },
    show: (note: Note) => {
      tick(clock, now());
      issued = note.id;
      notes = upsertToast(notes, note);
      const delay = dismissDelay(
        note.state ?? note.type,
        Boolean(note.action),
        note.lifetime,
        Boolean(toastCopy(note).description)
      );
      if (delay === null) {
        clock.waits.delete(note.id);
      } else {
        clock.waits.set(note.id, delay);
      }
      publish();
    },
    dismiss,
    nextDelay: () => {
      if (clock.since === null || !clock.waits.size) return undefined;
      tick(clock, now());
      return Math.max(0, Math.min(...clock.waits.values()));
    },
    advance: () => {
      tick(clock, now());
      const expired = new Set(
        [...clock.waits].filter(([, left]) => left <= 0).map(([id]) => id)
      );
      if (expired.size) {
        notes = notes.filter((note) => !expired.has(note.id));
        for (const id of expired) {
          clock.waits.delete(id);
        }
      }
      publish();
    },
    pause: (paused: boolean) => {
      tick(clock, now());
      clock.since = paused ? null : now();
      publish();
    },
    act: (note: Note) => {
      if (!notes.includes(note)) return;
      issued = null;
      note.action?.run();
      // An action may synchronously replace itself with a pending/success note.
      if (issued !== note.id) dismiss(note.id);
    },
  };
}

function nativeNow() {
  const runtime = globalThis as typeof globalThis & {
    performance?: { now: () => number };
  };
  return runtime.performance?.now() ?? Date.now();
}
