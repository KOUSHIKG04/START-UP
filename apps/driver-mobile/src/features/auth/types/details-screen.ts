import type { DriverProfile } from "./registration";

export type DetailsScreenProps = {
  initialProfile?: DriverProfile;
  profile?: DriverProfile;
  onSave: (profile: DriverProfile) => Promise<void> | void;
  onBack: () => void;
  initialConsent?: boolean;
};
