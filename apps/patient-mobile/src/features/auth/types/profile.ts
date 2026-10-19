import type { PatientAddress } from "./address";

export type ProfileDetails = {
  fullName: string;
  age: number;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  email?: string;
  address?: PatientAddress;
  relation?: string;
  phone?: string;
  notify?: boolean;
  photo?: { uri: string; mimeType: string };
};

export type ProfileFormValues = {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  email: string;
  address?: PatientAddress;
  relation: string;
  phone: string;
  notify: boolean;
};
