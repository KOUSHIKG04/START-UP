import { createContext, useContext, type ReactNode } from "react";
import {
  mobileTypography,
  type MobileTypographyRole,
} from "@startup/design-tokens";

const TypographyContext = createContext(false);
/** Explicit opt-in keeps Doctor and Driver unchanged while Patient trials the scale. */
export function MobileTypographyProvider({
  enabled = true,
  children,
}: {
  enabled?: boolean;
  children: ReactNode;
}) {
  return (
    <TypographyContext.Provider value={enabled}>
      {children}
    </TypographyContext.Provider>
  );
}
export function useReadableTypography() {
  return useContext(TypographyContext);
}
export function useMobileTypography(role: MobileTypographyRole) {
  return useReadableTypography() ? mobileTypography[role] : undefined;
}
