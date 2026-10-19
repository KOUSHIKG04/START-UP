import type { ProfileDetails } from "./profile";
import type { PatientAddress } from "./address";
export type ProfileFormProps = {
  family?: boolean;
  initialEmail?: string;
  initialPhone?: string;
  initialProfile?: {
    full_name: string;
    age_years: number | null;
    birth_date?: string | null;
    gender: string | null;
    blood_group: string | null;
    email: string | null;
    contact_phone?: string | null;
    relation?: string | null;
    notify?: boolean;
    address: PatientAddress | null;
    profile_photo_path?: string | null;
  };
  onSave: (details: ProfileDetails) => Promise<void>;
};

export type ProfileHeaderProps = {
  family: boolean;
  photoUrl?: string;
  onPickPhoto?: () => void;
};
