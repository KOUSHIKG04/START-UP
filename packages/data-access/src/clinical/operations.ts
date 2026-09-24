import { clinicalRecordSchema, issuePrescriptionSchema, recordDiagnosisSchema, recordVitalSchema, recommendFollowupSchema, uuidSchema } from "@startup/contracts";
import type { IssuePrescriptionInput, RecordDiagnosisInput, RecordVitalInput, RecommendFollowupInput } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function listMyClinicalRecords(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("list_my_clinical_records");
  if (error) throw error;
  return clinicalRecordSchema.array().parse(data);
}

export async function recordConsultationVital(client: AppSupabaseClient, input: RecordVitalInput) {
  const request = recordVitalSchema.parse(input);
  const { data, error } = await client.rpc("record_consultation_vital", {
    p_appointment_id: request.appointmentId,
    p_code: request.code,
    p_value: request.value,
    p_unit: request.unit,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function recordConsultationDiagnosis(client: AppSupabaseClient, input: RecordDiagnosisInput) {
  const request = recordDiagnosisSchema.parse(input);
  const { data, error } = await client.rpc("record_consultation_diagnosis", {
    p_appointment_id: request.appointmentId,
    p_description: request.description,
    p_is_primary: request.isPrimary,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function issueConsultationPrescription(client: AppSupabaseClient, input: IssuePrescriptionInput) {
  const request = issuePrescriptionSchema.parse(input);
  const { data, error } = await client.rpc("issue_consultation_prescription", {
    p_appointment_id: request.appointmentId,
    p_items: request.items,
    p_timezone: request.timezone,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}

export async function recommendConsultationFollowup(client: AppSupabaseClient, input: RecommendFollowupInput) {
  const request = recommendFollowupSchema.parse(input);
  const { data, error } = await client.rpc("recommend_consultation_followup", {
    p_appointment_id: request.appointmentId,
    p_date: request.date,
    p_timezone: request.timezone,
    p_reason: request.reason,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}
