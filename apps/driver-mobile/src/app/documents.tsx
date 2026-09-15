import { router } from "expo-router";
import { DocumentsScreen } from "../screens/registration/RegistrationScreens";
import { useDriver } from "../store/driver";
import { useDocuments } from "../store/documents";
export default function DocumentsRoute() {
  const documents = useDocuments();
  return (
    <DocumentsScreen
      initialDocuments={documents.value}
      onBack={() => router.back()}
      onSubmit={(value) => {
        documents.save(value);
        useDriver.getState().submit();
        router.replace("/verification");
      }}
    />
  );
}
