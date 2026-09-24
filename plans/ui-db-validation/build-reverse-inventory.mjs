import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("./", import.meta.url);
const inventory = JSON.parse(
  readFileSync(new URL("database-inventory.json", root), "utf8")
);
const groups = [
  [
    "Identity / patient",
    "identity patient patient_access patient_contact",
    "Patient profile/family; doctor authorized patient details; portal patient lookup",
    "Own-profile/dependent/access commands missing; never expose issuer/subject as editable fields",
  ],
  [
    "Tenant / practice membership",
    "organization facility organization_member member_doctor_scope",
    "Clinic setup, active facility selector, staff invitations/scope management",
    "Operational membership projection and invitation/revocation commands missing; solo doctor may own clinic",
  ],
  [
    "Directory",
    "doctor specialty symptom symptom_specialty doctor_specialty doctor_language doctor_facility practice_service",
    "Patient search/card/profile; doctor profile; portal doctor association",
    "Limited public directory read exists; detail/search/edit/verification contracts missing",
  ],
  [
    "Scheduling",
    "schedule_rule schedule_break schedule_exception doctor_booking_day session session_service appointment_window",
    "Doctor practice calendar; portal scheduling; patient slots",
    "Version/publish/exception APIs and UI missing; doctor_booking_day locking/counters backend-only",
  ],
  [
    "Appointments",
    "appointment checkin_token appointment_checkin",
    "Patient booking/status/QR; doctor/reception approvals/check-in",
    "Commands and lifecycle projections missing; QR contains credential, never hash or patient data",
  ],
  [
    "Queue",
    "session_queue queue_entry",
    "Doctor/reception queue control; patient own position",
    "Ticket/state visible; allocator/order_key/version internal; safe query/subscriptions missing",
  ],
  [
    "Clinical",
    "consultation vital_observation clinical_note consultation_diagnosis clinical_attachment followup_recommendation",
    "Doctor entry/history, patient records, follow-up booking",
    "Clinician signed commands and authorized read/download missing; reception limited to operational status",
  ],
  [
    "Prescription",
    "prescription prescription_revision prescription_item medication_phase medication_timing patient_routine",
    "Doctor structured prescription/revision; patient dosage/PDF/reminders/preferences",
    "Issue/amend/discontinue/read missing; richer timing UI absent; never silently flatten dosage",
  ],
  [
    "Feedback",
    "doctor_review platform_feedback ambulance_review",
    "Patient completion ratings/feedback; public published aggregate; moderation",
    "Submission/eligibility/moderation APIs missing; average derived",
  ],
  [
    "Transport workforce",
    "driver vehicle capability vehicle_capability driver_shift",
    "Driver profile/documents/online; operator eligibility/vehicle management",
    "Enrollment/review/shift APIs missing; verified capability is not user-selected truth",
  ],
  [
    "Transport booking",
    "ambulance_booking booking_capability booking_destination_change",
    "Patient request/SOS/destination change; driver/dispatcher request detail",
    "Participant-scoped request/cancel/reroute APIs missing",
  ],
  [
    "Dispatch",
    "dispatch_round dispatch_offer ambulance_assignment",
    "Driver offer countdown/response; patient assignment state; operator exceptions",
    "Transactional acceptance/expiry missing; dispatch round internals need diagnostics, not patient controls",
  ],
  [
    "Trip",
    "trip",
    "Driver and patient tracker, destination handoff/completion/history",
    "Authoritative transition API missing; explicit cancelled/destination states required",
  ],
  [
    "Location",
    "driver_location_latest trip_location tracking_share",
    "Driver location permission; patient/operator live tracking and sharing",
    "Restricted ingest/read/share missing; epoch/sequence/backend retention never ordinary UI fields",
  ],
  [
    "Emergency",
    "guest_emergency_session emergency_case triage_observation emergency_start_override",
    "Prelogin SOS, dispatcher/clinical triage, approved no-PIN start",
    "Scoped guest capability/claim and override flows missing; hashes/approver internals restricted",
  ],
  [
    "PIN",
    "patient_ambulance_pin pin_attempt",
    "Patient set/reset PIN; driver enter PIN/locked state; security diagnostics",
    "Verifier/pepper/attempt details backend-only; user receives safe rate-limit/recovery state",
  ],
  [
    "Payments",
    "fare_quote payment refund provider_event",
    "Patient fare/payment/refund, driver collection/history, authorized finance",
    "Payment is ambulance-only; verified reconciliation missing; raw provider_event backend-only",
  ],
  [
    "Notifications",
    "reminder_schedule reminder_occurrence notification_preference notification_endpoint notification_intent notification_delivery",
    "Patient medication/follow-up reminders; all-app preferences/inbox/notifications",
    "Worker/endpoint secret/lease details backend-only; inbox read state and processing missing",
  ],
  [
    "Infrastructure",
    "domain_event event_delivery idempotency_record",
    "No ordinary business UI; restricted operator diagnostics",
    "Backend-only transaction/event/retry/replay correctness; do not expose payloads or lease fields",
  ],
  [
    "Security",
    "audit_log clinical_access_grant",
    "Scoped audit/access review, patient delegation where policy requires",
    "Audit backend-only writes; least-privilege diagnostics; access grants require explicit management",
  ],
];
const lookup = new Map();
for (const [owner, names, ui, reason] of groups)
  for (const name of names.split(" ")) lookup.set(name, { owner, ui, reason });
const missing = inventory.tables.filter((t) => !lookup.has(t.table));
if (missing.length)
  throw new Error(`Unclassified tables: ${missing.map((t) => t.table)}`);
let md =
  "# Database → UI inventory\n\nBaseline: all 79 deployed-model tables. Generated from database-inventory.json plus explicit domain-to-UI review; no table is assumed public. Common IDs, foreign keys and versions may travel as opaque contract values, not editable UI. Hashes/verifiers/pepper keys/leases/request hashes remain backend-only. Clinical and contact fields need role-filtered projections. See per-app reports for missing fields/actions and api-contracts.md for permissions.\n\n";
for (const table of inventory.tables) {
  const group = lookup.get(table.table);
  md += `## ${table.table}\n\nOwner: ${group.owner}. UI: ${group.ui}.\n\n${group.reason}.\n\nColumns (complete baseline): ${table.columns.map((c) => "`" + c.name + "`").join(", ")}.\n\n`;
  const enums = table.columns.filter((c) => c.enumValues?.length);
  if (enums.length)
    md +=
      "Required state/type reconciliation: " +
      enums
        .map((c) => "`" + c.name + "`: " + c.enumValues.join(" / "))
        .join("; ") +
      ".\n\n";
  if (table.foreignKeys.length)
    md +=
      "Relationships: " +
      table.foreignKeys
        .map(
          (f) =>
            "`" +
            f.columns.join(",") +
            "` → `" +
            f.target +
            "(" +
            f.targetColumns.join(",") +
            ")`"
        )
        .join("; ") +
      ". Cardinality is constrained by the indexes described in architecture.md and the source schema; an FK alone does not imply 1:1.\n\n";
}
md +=
  "## Confirmed local additions (not deployed)\n\n`bed_type` supplies controlled bed categories; `facility_bed_inventory` holds one reported aggregate per facility/type, total/occupied/maintenance/observed_at/updating actor and version. Available and occupancy are derived. Patient admissions and individual beds are out of scope. Scoped command/read projection and freshness policy remain missing.\n";
writeFileSync(new URL("database-to-ui.md", root), md);
console.log(
  `Classified ${inventory.tables.length} tables and ${inventory.tables.reduce((n, t) => n + t.columns.length, 0)} columns → ${fileURLToPath(new URL("database-to-ui.md", root))}`
);
