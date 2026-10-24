import type { SettingsViewProps } from "../types/settings-view";
import { useState } from "react";

export function useProfileSettings({ onBack }: SettingsViewProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  return {
    helpOpen,
    setHelpOpen,
    privacyOpen,
    setPrivacyOpen,
    logoutOpen,
    setLogoutOpen,
  };
}
