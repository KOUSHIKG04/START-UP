import type { RegistrationDocuments } from "./registration";

export type DocumentsScreenProps = {
  onSubmit: (documents: RegistrationDocuments) => Promise<void> | void;
  onBack: () => void;
  initialDocuments?: RegistrationDocuments;
};
