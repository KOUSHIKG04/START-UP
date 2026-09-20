import { router } from "expo-router";
import { DocumentsScreen } from "../../features/auth/screens/RegistrationScreens";
import { useDriver } from "../../stores/driver";
import { useDocuments } from "../../stores/documents";
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
