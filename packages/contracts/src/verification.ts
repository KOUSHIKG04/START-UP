import { z } from "zod";

export const verificationStatusSchema = z.enum(["pending", "under_review", "needs_resubmission", "verified"]);
export const verificationSubjectSchema = z.enum(["doctor", "facility", "driver"]);
export const verificationDocumentSchema = z.object({
  id: z.uuid(), kind: z.string(), bucket_id: z.string(), storage_path: z.string(),
  version: z.number().int().positive(),
  status: z.enum(["pending", "approved", "rejected", "superseded"]),
  rejection_reason: z.string().nullable(), submitted_at: z.string(), reviewed_at: z.string().nullable(),
});
export const verificationQueueItemSchema = z.object({
  id: z.uuid(), status: verificationStatusSchema, submitted_at: z.string(),
  reviewed_at: z.string().nullable(), row_version: z.string(),
  subject_type: verificationSubjectSchema, subject_name: z.string(),
  document_count: z.number().int(), rejected_count: z.number().int(),
});
export const verificationCaseSchema = z.object({
  id: z.uuid(), status: verificationStatusSchema, submitted_at: z.string(),
  subject_type: verificationSubjectSchema, subject_name: z.string(),
  doctor: z.record(z.string(), z.unknown()).nullable(),
  facility: z.record(z.string(), z.unknown()).nullable(),
  driver: z.record(z.string(), z.unknown()).nullable(),
  documents: z.array(verificationDocumentSchema),
  history: z.array(z.object({ action: z.string(), document_id: z.uuid().nullable(),
    reason: z.string().nullable(), created_at: z.string() })),
});
export const verificationDecisionSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approved"), reason: z.null().optional() }),
  z.object({ decision: z.literal("rejected"), reason: z.string().trim().min(10).max(1000) }),
]);
export type VerificationQueueItem = z.infer<typeof verificationQueueItemSchema>;
export type VerificationCase = z.infer<typeof verificationCaseSchema>;
