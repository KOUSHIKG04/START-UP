import type { getDoctorConsultationDraft } from "@startup/data-access";
import { type ReactNode } from "react";
import type { IssuePrescriptionInput } from "@startup/contracts";

export type Medicine = IssuePrescriptionInput["items"][number];

export type DraftMedicine = Medicine & { draftId: string };

export type Meal = Medicine["timings"][number]["meal_anchor"];

export type FlowProps = {
  appointmentId: string;
  patientName: string;
  timezone: string;
  assessmentStep: ReactNode;
  completing: boolean;
};

export type ConsultationWizardProps = FlowProps & {
  initial: Awaited<ReturnType<typeof getDoctorConsultationDraft>>;
};
