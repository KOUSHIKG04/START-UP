import { ConsultationWizard } from "./ConsultationWizard";

import { useConsultationDraft } from "../hooks/useConsultationDraft";

import { Button, Loader } from "@startup/mobile-ui";

import { DoctorScreen, Label } from "../../../components/DoctorScreen";
import type { FlowProps } from "../types/consultation";

export function ConsultationForm(props: FlowProps) {
  const { draft } = useConsultationDraft(props);
  if (!draft.data)
    return (
      <DoctorScreen title="Consultation" bottomNav={false}>
        {draft.isError ? (
          <>
            <Label>Could not load the consultation.</Label>
            <Button
              theme="doctor"
              label="Retry"
              onPress={() => void draft.refetch()}
            />
          </>
        ) : (
          <Loader theme="doctor" />
        )}
      </DoctorScreen>
    );
  return (
    <ConsultationWizard
      key={props.appointmentId}
      {...props}
      initial={draft.data}
    />
  );
}
