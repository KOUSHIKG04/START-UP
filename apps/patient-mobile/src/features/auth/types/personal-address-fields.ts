import { type Control } from "react-hook-form";
import type { ProfileFormValues } from "./profile";

export type PersonalAddressFieldsProps = {
  control: Control<ProfileFormValues>;
  onClearError: () => void;
  field?: "email" | "address";
};
