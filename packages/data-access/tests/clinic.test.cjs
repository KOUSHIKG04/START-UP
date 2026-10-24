const { test } = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const path = require("node:path");

const vm = require("node:vm");

const { createRequire } = require("node:module");

const ts = require("typescript");

const cache = new Map();

function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require(name) {
      if (name === "@startup/contracts")
        return load(path.join(__dirname, "../../contracts/src/index.ts"));
      if (!name.startsWith(".")) return createRequire(file)(name);
      const base = path.resolve(path.dirname(file), name);
      const target = [base + ".ts", path.join(base, "index.ts")].find(
        fs.existsSync
      );
      if (!target) throw new Error(`Missing module ${name}`);
      return load(target);
    },
    Date,
    Error,
  });
  return module.exports;
}

const api = load(path.join(__dirname, "../src/clinic/operations.ts"));

const schedules = load(path.join(__dirname, "../src/doctors/schedule.ts"));

const clinical = load(path.join(__dirname, "../src/clinical/operations.ts"));

const recovery = load(path.join(__dirname, "../src/clinic/recovery.ts"));

const recoveryContracts = load(
  path.join(__dirname, "../../contracts/src/appointment-recovery.ts")
);

const id = "c1bbd5a5-b9eb-4c72-86fd-790269cab1cb";

function fixture(respond = () => id) {
  const calls = [];
  return {
    calls,
    client: {
      async rpc(name, args) {
        calls.push({ name, args: args && JSON.parse(JSON.stringify(args)) });
        return { data: respond(name, args), error: null };
      },
    },
  };
}

test("overdue presentation distinguishes expiry, clinic delay, missed attendance and active visits", () => {
  const now = Date.parse("2026-10-23T12:00:00Z");
  const item = {
    status: "confirmed",
    visit_mode: "online",
    starts_at: "2026-10-23T10:00:00Z",
    ends_at: "2026-10-23T10:15:00Z",
    request_expires_at: null,
    decision_reason: null,
    timezone: "Asia/Kolkata",
    queue_state: null,
    recovery: {
      attendance_deadline: "2026-10-23T10:30:00Z",
      can_manage: true,
      reschedule_count: 0,
      max_self_reschedules: 1,
      reschedule_cutoff_minutes: 0,
      request: null,
    },
  };
  let view = recoveryContracts.appointmentRecoveryView(item, now);
  assert.equal(view.patientStatus, "Appointment time passed");
  assert.equal(view.staffStatus, "Needs review");
  assert.equal(view.canJoin, false);
  assert.equal(view.canCancel, false);
  assert.equal(view.canMarkNoShow, true);
  view = recoveryContracts.appointmentRecoveryView(
    { ...item, visit_mode: "clinic", queue_state: "waiting" },
    now
  );
  assert.equal(view.patientStatus, "Waiting for doctor");
  assert.equal(view.canShowQueue, true);
  assert.equal(view.canShowQr, false);
  view = recoveryContracts.appointmentRecoveryView(
    { ...item, status: "in_consultation" },
    now
  );
  assert.equal(view.patientStatus, "Consultation in progress");
  assert.equal(view.canJoin, true);
  assert.equal(view.canMarkNoShow, false);
  view = recoveryContracts.appointmentRecoveryView(
    { ...item, status: "pending" },
    now
  );
  assert.equal(view.patientStatus, "Request expired");
  assert.equal(view.bookAgain, true);
  view = recoveryContracts.appointmentRecoveryView(
    { ...item, status: "no_show" },
    now
  );
  assert.equal(view.patientStatus, "Missed appointment");
  assert.equal(view.staffStatus, "Patient no-show");
  view = recoveryContracts.appointmentRecoveryView(
    {
      ...item,
      status: "cancelled",
      recovery: { ...item.recovery, outcome: "doctor_unavailable" },
    },
    now
  );
  assert.equal(view.patientStatus, "Doctor unavailable");
  assert.equal(view.canReschedule, true);
  view = recoveryContracts.appointmentRecoveryView(
    {
      ...item,
      status: "cancelled",
      recovery: { ...item.recovery, outcome: "rescheduled" },
    },
    now
  );
  assert.equal(view.patientStatus, "Rescheduled");
  assert.equal(view.canReschedule, false);
});

test("recovery operations forward optimistic versions and retry keys; invalid inputs do not call RPCs", async () => {
  const f = fixture(() => ({ kind: "rescheduled", id }));
  await recovery.rescheduleAppointment(f.client, {
    appointmentId: id,
    expectedVersion: 7,
    targetWindowId: id,
    reason: "  Change time  ",
    idempotencyKey: id,
  });
  assert.equal(f.calls[0].args.p_expected_version, 7);
  assert.equal(f.calls[0].args.p_idempotency_key, id);
  assert.equal(f.calls[0].args.p_reason, "Change time");
  await assert.rejects(
    recovery.rescheduleAppointment(f.client, {
      appointmentId: id,
      expectedVersion: 0,
      targetWindowId: id,
      reason: "",
      idempotencyKey: id,
    })
  );
  assert.equal(f.calls.length, 1);
});

test("availability preserves the live daily allowance alongside time choices", async () => {
  const f = fixture(() => [
    {
      service_mode: "online",
      window_id: id,
      practice_service_id: id,
      practice_id: id,
      doctor_name: "Test doctor",
      facility_name: "Test clinic",
      address: "Test address",
      starts_at: "2026-10-23T08:00:00Z",
      ends_at: "2026-10-23T08:15:00Z",
      timezone: "Asia/Kolkata",
      fee_minor: "10000",
      currency: "INR",
      daily_bookings_remaining: 8,
    },
  ]);
  const slots = await api.listPracticeClinicSlots(
    f.client,
    id,
    undefined,
    10000,
    "online"
  );
  assert.equal(slots[0].daily_bookings_remaining, 8);
  assert.equal(slots[0].window_id, id);
});

test("consultation reads preserve signed assessment and prescription details", async () => {
  const f = fixture(() => ({
    status: "signed",
    signed_at: "2026-10-23T09:00:00Z",
    assessment: "Saved assessment",
    medicines: [],
    vitals: [],
    diagnosis: "Saved diagnosis",
    prescription_issued: false,
    followup: null,
  }));
  const record = await clinical.getDoctorConsultationDraft(f.client, id);
  assert.equal(record.status, "signed");
  assert.equal(record.assessment, "Saved assessment");
  assert.deepEqual(f.calls[0], {
    name: "get_doctor_consultation_draft",
    args: { p_appointment_id: id },
  });
});

test("editable quotas survive saves and publication; invalid allocations never reach the API", async () => {
  const settings = {
    workingDays: [1, 2, 3],
    clinicStart: "09:00",
    clinicEnd: "18:00",
    slotMinutes: 30,
    onlineSlotMinutes: 30,
    homeSlotMinutes: 60,
    onlineDailyLimit: 5,
    walkinDailyLimit: 20,
    clinicAppDailyLimit: 12,
    clinicWalkinDailyLimit: 8,
    clinicTimeBlocks: [
      { start: "09:00", end: "10:00" },
      { start: "11:00", end: "12:00" },
    ],
    homeTimeBlocks: [{ start: "16:00", end: "17:00" }],
    homeTravelBufferMinutes: 15,
    autoAccept: true,
    autoAcceptLimit: 20,
    homeVisits: false,
    homeRadiusKm: null,
    onlineFeeMinor: 10000,
    clinicFeeMinor: 20000,
    homeFeeMinor: null,
  };
  const f = fixture((name, args) => {
    const saved = { ...args.p_settings, practice_id: id, row_version: "2" };
    return name === "save_my_schedule_preferences"
      ? saved
      : { settings: saved, slot_count: 20, horizon_days: 30 };
  });
  const saved = await schedules.saveMySchedulePreferences(
    f.client,
    id,
    settings,
    1
  );
  assert.equal(saved.clinic_app_daily_limit, 12);
  assert.equal(saved.clinic_walkin_daily_limit, 8);
  assert.equal(saved.clinic_time_blocks.length, 2);
  await schedules.publishMyDoctorSchedule(
    f.client,
    id,
    "clinic",
    settings,
    2,
    "2026-11-01"
  );
  assert.equal(f.calls[1].args.p_settings.clinic_app_daily_limit, 12);
  assert.equal(f.calls[1].args.p_settings.clinic_walkin_daily_limit, 8);
  assert.equal(f.calls[1].args.p_effective_from, "2026-11-01");
  assert.equal(f.calls[1].args.p_settings.clinic_time_blocks[1].start, "11:00");
  assert.equal(f.calls[1].args.p_settings.home_travel_buffer_minutes, 15);
  await assert.rejects(
    schedules.saveMySchedulePreferences(
      f.client,
      id,
      {
        ...settings,
        clinicTimeBlocks: [
          { start: "09:00", end: "10:00" },
          { start: "09:30", end: "11:00" },
        ],
      },
      2
    )
  );
  await assert.rejects(
    schedules.saveMySchedulePreferences(
      f.client,
      id,
      { ...settings, homeTimeBlocks: [{ start: "00:05", end: "01:05" }] },
      2
    )
  );
  await assert.rejects(
    schedules.saveMySchedulePreferences(
      f.client,
      id,
      { ...settings, clinicWalkinDailyLimit: 9 },
      2
    )
  );
  assert.equal(f.calls.length, 2);
});

test("booking retains the idempotency key, patient, service, window and trimmed reason", async () => {
  const f = fixture();
  assert.equal(
    await api.bookClinicAppointment(f.client, {
      patientId: id,
      windowId: id,
      practiceServiceId: id,
      idempotencyKey: id,
      reason: "  Review  ",
    }),
    id
  );
  assert.deepEqual(f.calls, [
    {
      name: "book_clinic_appointment",
      args: {
        p_patient_id: id,
        p_window_id: id,
        p_practice_service_id: id,
        p_reason: "Review",
        p_idempotency_key: id,
      },
    },
  ]);
  await assert.rejects(
    api.bookClinicAppointment(f.client, {
      patientId: "invalid",
      windowId: id,
      practiceServiceId: id,
      idempotencyKey: id,
      reason: "",
    })
  );
  assert.equal(f.calls.length, 1);
});

test("walk-in booking preserves empty phone/reason as null and transitions retain optimistic versions", async () => {
  const f = fixture();
  await api.bookPortalWalkInAppointment(f.client, {
    practiceId: id,
    windowId: id,
    practiceServiceId: id,
    patientName: " Patient ",
    patientPhone: "",
    reason: "",
    idempotencyKey: id,
  });
  assert.equal(f.calls[0].name, "book_portal_walk_in_appointment");
  assert.equal(f.calls[0].args.p_patient_name, "Patient");
  assert.equal(f.calls[0].args.p_patient_phone, null);
  assert.equal(f.calls[0].args.p_reason, null);
  assert.equal(f.calls[0].args.p_patient_age, null);
  assert.equal(f.calls[0].args.p_patient_gender, null);
  assert.equal(f.calls[0].args.p_check_in, false);
  await api.transitionClinicAppointment(f.client, {
    appointmentId: id,
    expectedVersion: 3,
    action: "approve",
  });
  assert.deepEqual(f.calls[1], {
    name: "transition_clinic_appointment",
    args: {
      p_appointment_id: id,
      p_expected_version: 3,
      p_action: "approve",
      p_note: null,
    },
  });
});

test("reception forwards demographics and check-in without changing the idempotency key", async () => {
  const f = fixture();
  await api.bookPortalWalkInAppointment(f.client, {
    practiceId: id,
    windowId: id,
    practiceServiceId: id,
    patientName: "Walk-in Patient",
    patientPhone: "1234567890",
    reason: "Review",
    patientAge: 29,
    patientGender: "Other",
    checkIn: true,
    idempotencyKey: id,
  });
  assert.equal(f.calls[0].args.p_patient_age, 29);
  assert.equal(f.calls[0].args.p_patient_gender, "Other");
  assert.equal(f.calls[0].args.p_check_in, true);
  assert.equal(f.calls[0].args.p_idempotency_key, id);
  await assert.rejects(
    api.bookPortalWalkInAppointment(f.client, {
      practiceId: id,
      windowId: id,
      practiceServiceId: id,
      patientName: "Patient",
      patientAge: 121,
      patientGender: "Other",
      idempotencyKey: id,
    })
  );
  assert.equal(f.calls.length, 1);
});

test("availability retains separate legacy and mode-aware RPCs and their limits", async () => {
  const f = fixture(() => []);
  await api.listPracticeClinicSlots(f.client, id);
  await api.listPracticeClinicSlots(f.client, id, id, 10000, "home");
  assert.deepEqual(f.calls[0], {
    name: "list_practice_clinic_slots",
    args: {
      p_practice_id: id,
      p_service_id: null,
      p_limit: 100,
    },
  });
  assert.deepEqual(f.calls[1], {
    name: "list_practice_service_slots",
    args: {
      p_practice_id: id,
      p_service_id: id,
      p_limit: 10000,
      p_mode: "home",
    },
  });
  await assert.rejects(
    api.listPracticeClinicSlots(f.client, id, undefined, 101),
    /Invalid slot limit/
  );
  await assert.rejects(
    api.listPracticeClinicSlots(f.client, id, undefined, 10001, "online"),
    /Invalid slot limit/
  );
  await api.listClinicSlots(f.client, new Date("2026-10-18T08:00:00Z"), 25);
  assert.equal(f.calls[2].args.p_after, "2026-10-18T08:00:00.000Z");
});

test("publishing preserves explicit duration, fees, service modes and selected times", async () => {
  const f = fixture((name) =>
    name === "publish_selected_doctor_slots" ? [id] : id
  );
  const input = {
    practiceId: id,
    startsAt: "2026-10-18T09:00:00+05:30",
    endsAt: "2026-10-18T21:00:00+05:30",
    slotMinutes: 15,
    feeMinor: 50000,
    currency: "INR",
  };
  await api.publishClinicSession(f.client, input);
  await api.publishDoctorServiceSession(f.client, { ...input, mode: "online" });
  await api.publishSelectedDoctorSlots(f.client, {
    practiceId: id,
    mode: "home",
    slotStarts: [input.startsAt],
    slotMinutes: 30,
    feeMinor: 80000,
    currency: "INR",
  });
  assert.equal(f.calls[0].args.p_slot_minutes, 15);
  assert.equal(f.calls[0].args.p_ends_at, input.endsAt);
  assert.equal(f.calls[1].name, "publish_doctor_service_session");
  assert.equal(f.calls[1].args.p_mode, "online");
  assert.deepEqual(f.calls[2].args.p_slot_starts, [input.startsAt]);
  assert.equal(f.calls[2].args.p_slot_minutes, 30);
  assert.equal(f.calls[2].args.p_fee_minor, 80000);
});

test("check-in tokens retain validation and API errors reach the caller unchanged", async () => {
  const token = "a".repeat(72);
  const f = fixture((name) =>
    name === "issue_clinic_checkin_token" ? token : id
  );
  assert.equal(await api.issueClinicCheckinToken(f.client, id), token);
  assert.equal(await api.redeemClinicCheckinToken(f.client, token), id);
  assert.deepEqual(f.calls[1], {
    name: "redeem_clinic_checkin_token",
    args: { p_token: token },
  });
  await assert.rejects(api.redeemClinicCheckinToken(f.client, "invalid"));
  assert.equal(f.calls.length, 2);
  const error = { message: "Version conflict", code: "P0001" };
  await assert.rejects(
    api.listMyPractices({ rpc: async () => ({ error }) }),
    (value) => value === error
  );
});

test("practice appointment aggregation retains deduplication and reverse chronological order", async () => {
  const other = "c1bbd5a5-b9eb-4c72-86fd-790269cab1cc";
  const appointment = {
    id,
    visit_mode: "clinic",
    public_code: "A-01",
    status: "confirmed",
    row_version: "1",
    patient_id: id,
    patient_name: "Patient",
    patient_public_code: "P-01",
    patient_gender: null,
    patient_age_years: null,
    patient_blood_group: null,
    service_name: "Clinic",
    doctor_name: "Doctor",
    facility_name: "Clinic",
    reason: null,
    fee_minor: "50000",
    currency: "INR",
    starts_at: "2026-10-18T10:00:00Z",
    ends_at: "2026-10-18T10:15:00Z",
    timezone: "Asia/Kolkata",
    request_expires_at: null,
    decision_reason: null,
    queue_state: null,
    ticket_number: null,
    ahead_count: 0,
    can_consult: false,
    assessment: null,
  };
  const linked = fixture(() => [
    {
      ...appointment,
      practice_id: id,
      practice_service_id: other,
    },
  ]);
  const [linkedAppointment] = await api.listClinicAppointments(linked.client);
  assert.equal(linkedAppointment.practice_id, id);
  assert.equal(linkedAppointment.practice_service_id, other);
  const legacy = fixture(() => [appointment]);
  const [legacyAppointment] = await api.listClinicAppointments(legacy.client);
  assert.equal(legacyAppointment.practice_id, undefined);
  const invalid = fixture(() => [
    { ...appointment, practice_id: "wrong-doctor-id" },
  ]);
  await assert.rejects(api.listClinicAppointments(invalid.client));
  const f = fixture((name, args) =>
    name === "list_my_practices"
      ? [id, other].map((practice_id) => ({
          practice_id,
          doctor_name: "Doctor",
          facility_name: "Clinic",
          verified: true,
          is_clinician: true,
        }))
      : args.p_practice_id === id
        ? [appointment]
        : [
            appointment,
            { ...appointment, id: other, starts_at: "2026-10-18T12:00:00Z" },
          ]
  );
  const appointments = await api.listMyPracticeAppointments(f.client);
  assert.equal(appointments.length, 2);
  assert.equal(appointments[0].id, other);
  assert.equal(appointments[1].id, id);
});
