// Server-only models for the company document-review workflow.
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { clinzo } from "./common";
import { doctor } from "./directory";
import { driverRegistrationApplication } from "./ambulance-workforce";
import { identity } from "./identity";
import { facility } from "./organizations";

export const companyReviewer = clinzo.table("company_reviewer", {
  identity_id: uuid("identity_id").primaryKey().references(() => identity.id, { onDelete: "restrict" }),
  active: boolean("active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}).enableRLS();

export const verificationCase = clinzo.table("verification_case", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctor_id: uuid("doctor_id").references(() => doctor.id, { onDelete: "restrict" }),
  facility_id: uuid("facility_id").references(() => facility.id, { onDelete: "restrict" }),
  driver_application_id: uuid("driver_application_id").references(() => driverRegistrationApplication.id, { onDelete: "restrict" }),
  status: text("status", { enum: ["pending", "under_review", "needs_resubmission", "verified"] }).notNull().default("pending"),
  created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  submitted_at: timestamp("submitted_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  reviewed_at: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  row_version: bigint("row_version", { mode: "bigint" }).notNull().default(sql`1`),
}, (t) => [
  uniqueIndex("verification_case_doctor_id_key").on(t.doctor_id),
  uniqueIndex("verification_case_facility_id_key").on(t.facility_id),
  uniqueIndex("verification_case_driver_application_id_key").on(t.driver_application_id),
  index("verification_case_queue_idx").on(t.status, t.submitted_at.desc()),
  check("verification_case_subject_ck", sql`num_nonnulls(${t.doctor_id}, ${t.facility_id}, ${t.driver_application_id}) = 1`),
  check("verification_case_row_version_ck", sql`${t.row_version} > 0`),
]).enableRLS();

export const verificationDocument = clinzo.table("verification_document", {
  id: uuid("id").primaryKey().defaultRandom(),
  case_id: uuid("case_id").notNull().references(() => verificationCase.id, { onDelete: "restrict" }),
  kind: text("kind").notNull(),
  bucket_id: text("bucket_id", { enum: ["doctor-licenses", "driver-evidence", "facility-evidence"] }).notNull(),
  storage_path: text("storage_path").notNull(),
  version: integer("version").notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected", "superseded"] }).notNull().default("pending"),
  rejection_reason: text("rejection_reason"),
  submitted_at: timestamp("submitted_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  reviewed_at: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
  reviewer_id: uuid("reviewer_id").references(() => identity.id, { onDelete: "restrict" }),
}, (t) => [
  uniqueIndex("verification_document_case_id_kind_version_key").on(t.case_id, t.kind, t.version),
  uniqueIndex("verification_document_bucket_id_storage_path_key").on(t.bucket_id, t.storage_path),
  index("verification_document_current_idx").on(t.case_id, t.kind, t.version.desc()),
]).enableRLS();

export const verificationEvent = clinzo.table("verification_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  case_id: uuid("case_id").notNull().references(() => verificationCase.id, { onDelete: "restrict" }),
  document_id: uuid("document_id").references(() => verificationDocument.id, { onDelete: "restrict" }),
  action: text("action", { enum: ["submitted", "resubmitted", "under_review", "approved", "rejected", "verified"] }).notNull(),
  actor_id: uuid("actor_id").references(() => identity.id, { onDelete: "restrict" }),
  reason: text("reason"),
  created_at: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (t) => [index("verification_event_case_idx").on(t.case_id, t.created_at.desc())]).enableRLS();
