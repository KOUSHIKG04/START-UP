import { create } from "zustand";
import type { RegistrationDocuments } from "../features/auth/screens/RegistrationScreens";
export const useDocuments = create<{
  value?: RegistrationDocuments;
  save: (value: RegistrationDocuments) => void;
}>((set) => ({ save: (value) => set({ value }) }));
