import { createContext, useCallback, useContext, type ReactNode } from "react";
import { selectionAsync } from "expo-haptics";

const SoundContext = createContext<() => void>(() => {});

/** Native adaptation: haptics only from an explicit control press, never arrival. */
export function SoundEffects({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const press = useCallback(() => {
    if (enabled) void selectionAsync().catch(() => {});
  }, [enabled]);
  return (
    <SoundContext.Provider value={press}>{children}</SoundContext.Provider>
  );
}

export function useSoundEffects() {
  return useContext(SoundContext);
}
