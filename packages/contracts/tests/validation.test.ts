import { expect, test } from "bun:test";
import { onboardingSchema, phoneSchema } from "../src/validation";
import { clinicBookingSchema, clinicTransitionSchema } from "../src/clinic";
import { updateBedInventorySchema } from "../src/facilities";
import { driverRegistrationDetailsSchema, driverRegistrationSubmissionSchema } from "../src/driver-profile";
import { formatDisplayDate, parseDisplayDate } from "../src/dates";
import { doctorScheduleSettingsSchema } from "../src/doctor-schedule";

const id = "c1bbd5a5-b9eb-4c72-86fd-790269cab1cb";

test("display dates round-trip without changing the ISO database date", () => {
  expect(parseDisplayDate("05-10-2026")).toBe("2026-10-05");
  expect(formatDisplayDate("2026-10-05")).toBe("05-10-2026");
  expect(parseDisplayDate("29-02-2024")).toBe("2024-02-29");
  expect(parseDisplayDate("29-02-2026")).toBeNull();
  expect(parseDisplayDate("2026-10-05")).toBeNull();
});

test("doctor schedule accepts 24:00 only as an end-of-day boundary", () => {
  expect(doctorScheduleSettingsSchema.shape.clinicEnd.safeParse("24:00").success).toBe(true);
  expect(doctorScheduleSettingsSchema.shape.clinicStart.safeParse("24:00").success).toBe(false);
  expect(doctorScheduleSettingsSchema.shape.clinicEnd.safeParse("24:01").success).toBe(false);
});

test("onboarding never accepts a caller-selected role or organization", () => {
  expect(onboardingSchema.safeParse({
    kind: "patient",
    details: { full_name: "Sample Patient", role: "owner" },
  }).success).toBe(false);
  expect(onboardingSchema.safeParse({
    kind: "driver_independent",
    details: {
      full_name: "Sample Driver",
      license_number: "TEST-LICENCE",
      license_expires_on: "2030-01-01",
      organization_id: id,
    },
  }).success).toBe(false);
  expect(onboardingSchema.safeParse({
    kind: "solo_doctor",
    details: {
      full_name: "Sample Doctor",
      registration_authority: "TEST",
      registration_number: "TEST-001",
      practice_started_on: "2020-01-01",
      clinic_name: "Test Clinic",
      address: "Test Street",
      latitude: 90.1,
      longitude: 77.5,
    },
  }).success).toBe(false);
});

test("booking accepts stable IDs and a reason, never a caller-selected fee or actor", () => {
  const request = {
    patientId: id,
    windowId: id,
    practiceServiceId: id,
    reason: "Cough",
    idempotencyKey: id,
  };
  expect(clinicBookingSchema.safeParse(request).success).toBe(true);
  expect(clinicBookingSchema.safeParse({ ...request, feeMinor: 1 }).success).toBe(false);
  expect(clinicBookingSchema.safeParse({ ...request, actorId: id }).success).toBe(false);
  expect(clinicBookingSchema.safeParse({ ...request, visitMode: "home" }).success).toBe(false);
  expect(clinicBookingSchema.safeParse({ ...request, reason: " " }).success).toBe(true);
});

test("phone sign-in and expected appointment version have bounded input", () => {
  expect(phoneSchema.safeParse("+919876543210").success).toBe(true);
  expect(phoneSchema.safeParse("9876543210").success).toBe(false);
  expect(clinicTransitionSchema.safeParse({
    appointmentId: id, expectedVersion: "2", action: "approve",
  }).success).toBe(true);
  expect(clinicTransitionSchema.safeParse({
    appointmentId: id, expectedVersion: "-1", action: "approve",
  }).success).toBe(false);
});

test("inventory edits preserve the count invariant and server-owned observation time", () => {
  const request = {
    facilityId: id,
    bedTypeId: id,
    total: 10,
    occupied: 6,
    maintenance: 2,
    expectedRowVersion: "0",
  };
  expect(updateBedInventorySchema.safeParse(request).success).toBe(true);
  expect(updateBedInventorySchema.safeParse({ ...request, occupied: 9 }).success).toBe(false);
  expect(updateBedInventorySchema.safeParse({ ...request, expectedRowVersion: "-1" }).success).toBe(false);
  expect(updateBedInventorySchema.safeParse({ ...request, observedAt: "2030-01-01" }).success).toBe(false);
  expect(updateBedInventorySchema.safeParse({ ...request, actorId: id }).success).toBe(false);
});

test("driver registration accepts UI evidence without caller-selected approval or reviewed credentials", () => {
  const details = {
    fullName: "Sample Driver", contactPhone: "+919876543210", dateOfBirth: "1990-01-01",
    city: "Bengaluru", consent: true,
  };
  expect(driverRegistrationDetailsSchema.safeParse(details).success).toBe(true);
  expect(driverRegistrationDetailsSchema.safeParse({ ...details, licenseExpiresOn: "2030-01-01" }).success).toBe(false);
  const documents = Object.fromEntries([
    "aadhaar", "pan", "driving_licence", "vehicle_rc", "insurance", "fitness", "ambulance_image", "equipment_images",
  ].map(kind => [kind, `fixture/${kind}.pdf`]));
  const application = { capabilityCode: "BLS", registrationNumber: "KA01AB1001", documents };
  expect(driverRegistrationSubmissionSchema.safeParse(application).success).toBe(true);
  expect(driverRegistrationSubmissionSchema.safeParse({ ...application, documents: {} }).success).toBe(false);
  expect(driverRegistrationSubmissionSchema.safeParse({ ...application, approved: true }).success).toBe(false);
});
