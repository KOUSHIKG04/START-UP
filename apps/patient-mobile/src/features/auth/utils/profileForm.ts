import {
  ageFromBirthDate,
  formatDisplayDate,
  parseDisplayDate,
  contactPhoneForInput,
  normalizeContactPhone,
} from "@startup/contracts";
import type { ProfileDetails, ProfileFormValues } from "../types/profile";
import type { PatientAddress } from "../types/address";
export function getInitialFormValues(
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
  },
  family = false,
  initialEmail = "",
  initialPhone = ""
): ProfileFormValues {
  return {
    fullName: initialProfile?.full_name ?? "",
    dateOfBirth: initialProfile?.birth_date
      ? formatDisplayDate(initialProfile.birth_date)
      : "",
    gender: initialProfile?.gender ?? "Male",
    bloodGroup: (initialProfile?.blood_group ?? "").replace("-", "−"),
    email: initialProfile?.email ?? (!family ? initialEmail : ""),
    address: initialProfile?.address ?? undefined,
    relation: initialProfile?.relation ?? "Son",
    phone: contactPhoneForInput(
      initialProfile?.contact_phone || (!family ? initialPhone : "")
    ),
    notify: initialProfile?.notify ?? false,
  };
}

export function formatProfilePayload(
  values: ProfileFormValues,
  family: boolean
): ProfileDetails {
  const birthDate = parseDisplayDate(values.dateOfBirth)!;
  const years = ageFromBirthDate(birthDate)!;
  return {
    fullName: values.fullName.trim(),
    age: years,
    dateOfBirth: birthDate,
    gender: values.gender,
    bloodGroup: values.bloodGroup.replace("−", "-"),
    email: values.email?.trim() || undefined,
    address: values.address,
    relation: family ? values.relation : undefined,
    phone: normalizeContactPhone(values.phone) ?? undefined,
    notify: family ? values.notify : undefined,
  };
}
