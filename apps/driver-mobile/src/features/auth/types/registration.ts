import * as DocumentPicker from "expo-document-picker";
import { type PatientAddress } from "./address";

export type DriverProfile = {
  name: string;
  mobile: string;
  dob: string;
  city: string;
  address?: PatientAddress;
  photo?: string;
  photoMimeType?: "image/jpeg" | "image/png";
};

export type RegistrationDocuments = {
  classification: "BLS" | "ALS" | "NICU";
  registration: string;
  files: Record<string, DocumentPicker.DocumentPickerAsset>;
};
