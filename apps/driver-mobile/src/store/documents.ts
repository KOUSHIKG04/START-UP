import { create } from "zustand";
import type { RegistrationDocuments } from "../screens/registration/RegistrationScreens";
export const useDocuments = create<{
  value?: RegistrationDocuments;
  save: (value: RegistrationDocuments) => void;
}>((set) => ({ save: (value) => set({ value }) }));
