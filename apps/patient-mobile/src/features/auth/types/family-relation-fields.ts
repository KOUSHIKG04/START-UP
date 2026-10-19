import { type Control } from "react-hook-form";
import type { ProfileFormValues } from "./profile";
export type FamilyRelationFieldsProps = {
  control: Control<ProfileFormValues>;
  onClearError: () => void;
};
