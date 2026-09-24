import { createDatabase } from "../src/client";
import { identity } from "../src/schema/identity";
import {
  organization,
  facility,
  organizationMember,
} from "../src/schema/organizations";
import {
  doctor,
  doctorFacility,
  practiceService,
} from "../src/schema/directory";
import { sql } from "drizzle-orm";

if (!process.argv.includes("--demo") || process.env.NODE_ENV === "production") {
  throw new Error(
    "Demo seed requires --demo and a non-production environment; use a development Supabase project only"
  );
}
const url = process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error("Set MIGRATION_DATABASE_URL");
const connection = createDatabase(url);
try {
  await connection.db.transaction(async (tx) => {
    // Stable IDs and do-nothing conflicts make repeats safe without overwriting local edits.
    const ids = {
      identity: "10000000-0000-4000-8000-000000000001",
      organization: "10000000-0000-4000-8000-000000000002",
      clinic: "10000000-0000-4000-8000-000000000003",
      doctor: "10000000-0000-4000-8000-000000000004",
      practice: "10000000-0000-4000-8000-000000000005",
      member: "10000000-0000-4000-8000-000000000006",
      service: "10000000-0000-4000-8000-000000000007",
    };
    await tx
      .insert(identity)
      .values({
        id: ids.identity,
        issuer: "urn:clinzo:demo",
        subject: "demo-doctor",
        display_name: "Demo Doctor",
      })
      .onConflictDoNothing();
    await tx
      .insert(organization)
      .values({
        id: ids.organization,
        public_code: "DEMO-ORG-1",
        name: "Demo Solo Clinic",
        kind: "care_provider",
      })
      .onConflictDoNothing();
    await tx
      .insert(facility)
      .values({
        id: ids.clinic,
        organization_id: ids.organization,
        public_code: "DEMO-CLINIC-1",
        name: "Demo Solo Clinic",
        kind: "clinic",
        address: "Synthetic development clinic, Bengaluru",
        location: sql`extensions.ST_SetSRID(extensions.ST_MakePoint(77.5946, 12.9716),4326)::extensions.geography`,
      })
      .onConflictDoNothing();
    await tx
      .insert(doctor)
      .values({
        id: ids.doctor,
        identity_id: ids.identity,
        public_code: "DEMO-DOC-1",
        full_name: "Demo Doctor",
        registration_authority: "DEMO",
        registration_number: "NOT-A-REAL-LICENSE",
        practice_started_on: "2022-01-01",
        credential_status: "verified",
      })
      .onConflictDoNothing();
    await tx
      .insert(organizationMember)
      .values({
        id: ids.member,
        identity_id: ids.identity,
        organization_id: ids.organization,
        role: "owner",
      })
      .onConflictDoNothing();
    await tx
      .insert(doctorFacility)
      .values({
        id: ids.practice,
        doctor_id: ids.doctor,
        facility_id: ids.clinic,
      })
      .onConflictDoNothing();
    await tx
      .insert(practiceService)
      .values({
        id: ids.service,
        doctor_facility_id: ids.practice,
        code: "general",
        name: "Demo consultation",
        fee_minor: 50000n,
        currency: "INR",
        duration_minutes: 30,
      })
      .onConflictDoNothing();
  });
  console.log(
    "Synthetic solo-doctor clinic created. No staff employee, beds, patient data or Auth login was created."
  );
} finally {
  await connection.close();
}
