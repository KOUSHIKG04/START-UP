import { router } from "expo-router";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { useQueryClient } from "@tanstack/react-query";
import { submitMyDriverRegistrationApplication } from "@startup/data-access";
import type { DriverDocumentKind } from "@startup/contracts";
import {
  DocumentsScreen,
  type RegistrationDocuments,
} from "../../features/auth/screens/RegistrationScreens";
import { supabase, useMobileSession } from "../../services/supabase";

const documentKinds: Record<string, DriverDocumentKind> = {
  "Aadhaar Card": "aadhaar",
  "PAN Card": "pan",
  "Driving licence": "driving_licence",
  "Vehicle RC": "vehicle_rc",
  Insurance: "insurance",
  "Fitness certificate": "fitness",
  "Ambulance Image": "ambulance_image",
  "Equipment Images": "equipment_images",
};

export default function DocumentsRoute() {
  const { session } = useMobileSession();
  const queryClient = useQueryClient();
  async function submit(value: RegistrationDocuments) {
    if (!supabase || !session) throw new Error("Sign in to continue.");
    const client = supabase;
    const currentSession = session;
    const entries = await Promise.all(
      Object.entries(documentKinds).map(async ([label, kind]) => {
        const file = value.files[label];
        if (!file) throw new Error(`Select ${label} to continue.`);
        const extension =
          file.mimeType === "application/pdf"
            ? "pdf"
            : file.mimeType === "image/png"
              ? "png"
              : "jpg";
        const path = `${currentSession.user.id}/application/${kind}/${Crypto.randomUUID()}.${extension}`;
        const bytes = await new File(file.uri).arrayBuffer();
        const upload = await client.storage
          .from("driver-evidence")
          .upload(path, bytes, {
            contentType: file.mimeType ?? "application/pdf",
            upsert: false,
          });
        if (upload.error) throw upload.error;
        return [kind, path] as const;
      })
    );
    const paths = Object.fromEntries(entries) as Record<
      DriverDocumentKind,
      string
    >;
    await submitMyDriverRegistrationApplication(client, {
      capabilityCode: value.classification,
      registrationNumber: value.registration,
      documents: paths,
    });
    await queryClient.invalidateQueries({
      queryKey: ["driver-registration-application"],
    });
    router.replace("/verification");
  }
  return <DocumentsScreen onBack={() => router.back()} onSubmit={submit} />;
}
