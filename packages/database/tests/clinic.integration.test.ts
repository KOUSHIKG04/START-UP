import { afterAll, expect, test } from "bun:test";
import postgres from "postgres";

const url = process.env.TEST_DATABASE_URL;
const enabled =
  !!url &&
  process.env.ALLOW_DATABASE_TESTS ===
    "I_UNDERSTAND_THIS_IS_A_DISPOSABLE_DATABASE";
const db = enabled ? postgres(url!, { max: 1, prepare: false }) : undefined;
afterAll(async () => {
  await db?.end();
});

// Apply every pending migration to a separate disposable Supabase stack first.
// This checks actual PostgreSQL grants and unauthenticated behavior, not just SQL text.
test.skipIf(!enabled)(
  "clinic RPC exposure follows the trust boundary",
  async () => {
    const [access] = await db!`
    select has_function_privilege('anon','public.list_clinic_slots(timestamptz,integer)','EXECUTE') as public_slots,
      has_function_privilege('anon','public.book_clinic_appointment(uuid,uuid,uuid,text,uuid)','EXECUTE') as anon_booking,
      has_function_privilege('authenticated','clinzo.record_manual_credential_review(text,uuid,text,text,text)','EXECUTE') as self_review,
      has_function_privilege('authenticated','public.complete_onboarding(text,jsonb)','EXECUTE') as self_onboard`;
    expect(access?.public_slots).toBe(true);
    expect(access?.anon_booking).toBe(false);
    expect(access?.self_review).toBe(false);
    expect(access?.self_onboard).toBe(true);

    await expect(
      db!.begin(async (tx) => {
        await tx`set local role anon`;
        const [slots] = await tx`select public.list_clinic_slots() as result`;
        expect(Array.isArray(slots?.result)).toBe(true);
        await tx`select public.get_my_profile()`;
      })
    ).rejects.toMatchObject({ code: "42501" });
  },
  120000
);

// The fixture includes temporary Supabase Auth users and is rolled back in full.
// Run only against an explicitly disposable, fully migrated Supabase database.
test.skipIf(!enabled)(
  "phone identity to solo-doctor clinic completion",
  async () => {
    const rollback = new Error("rollback_clinic_fixture");
    try {
      await db!.begin(async (tx) => {
        const doctorAuthId = crypto.randomUUID();
        const patientAuthId = crypto.randomUUID();
        const suffix = Math.floor(
          1_000_000_000 + Math.random() * 8_000_000_000
        );
        const doctorPhone = `+91${suffix}`;
        const patientPhone = `+91${suffix + 1}`;
        for (const [id, phone] of [
          [doctorAuthId, doctorPhone],
          [patientAuthId, patientPhone],
        ] as const) {
          await tx`insert into auth.users(id,instance_id,aud,role,phone,phone_confirmed_at)
          values(${id}::uuid,'00000000-0000-0000-0000-000000000000'::uuid,'authenticated','authenticated',${phone},now())`;
        }

        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claim.sub',${doctorAuthId},true)`;
        const [doctorOnboarding] =
          await tx`select public.complete_onboarding('solo_doctor',
        jsonb_build_object('full_name','Fixture Doctor','registration_authority','Fixture Council',
          'registration_number',${doctorAuthId},'practice_started_on','2020-01-01',
          'clinic_name','Fixture Clinic','address','123 Fixture Street',
          'latitude',12.9,'longitude',77.5)) as profile`;
        expect(doctorOnboarding?.profile?.doctor?.status).toBe("pending");
        const doctorId = doctorOnboarding?.profile?.doctor?.id as string;
        const [doctorProfile] =
          await tx`select public.get_my_profile() as profile`;
        expect(doctorProfile?.profile?.doctor?.id).toBe(doctorId);
        await tx`reset role`;

        await tx`select clinzo.record_manual_credential_review('doctor',${doctorId}::uuid,
        'verified','fixture-reviewer','fixture-evidence')`;
        const timezone =
          new Date().getUTCHours() >= 22 ? "Pacific/Honolulu" : "UTC";
        await tx`update clinzo.doctor set booking_timezone=${timezone} where id=${doctorId}::uuid`;

        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claim.sub',${doctorAuthId},true)`;
        const [practices] =
          await tx`select public.list_my_practices() as value`;
        expect(practices?.value).toHaveLength(1);
        const practiceId = practices?.value?.[0]?.practice_id as string;
        const startsAt = new Date(Date.now() + 60 * 60 * 1000);
        const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
        const [session] =
          await tx`select public.publish_clinic_session(${practiceId}::uuid,
        ${startsAt.toISOString()}::timestamptz,${endsAt.toISOString()}::timestamptz,30,50000,'INR') as id`;
        expect(session?.id).toBeTruthy();
        await tx`reset role`;

        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claim.sub',${patientAuthId},true)`;
        const [patientOnboarding] =
          await tx`select public.complete_onboarding('patient',
        '{"full_name":"Fixture Patient"}'::jsonb) as profile`;
        const patientId = patientOnboarding?.profile?.patient_id as string;
        expect(patientId).toBeTruthy();
        const [slots] = await tx`select public.list_clinic_slots() as value`;
        const slot = slots?.value?.find(
          (item: { practice_id: string }) => item.practice_id === practiceId
        );
        expect(slot).toBeTruthy();
        const key = crypto.randomUUID();
        const [booking] =
          await tx`select public.book_clinic_appointment(${patientId}::uuid,
        ${slot.window_id}::uuid,${slot.practice_service_id}::uuid,'Fixture consultation',${key}::uuid) as id`;
        const appointmentId = booking?.id as string;
        expect(appointmentId).toBeTruthy();
        const [replay] =
          await tx`select public.book_clinic_appointment(${patientId}::uuid,
        ${slot.window_id}::uuid,${slot.practice_service_id}::uuid,'Fixture consultation',${key}::uuid) as id`;
        expect(replay?.id).toBe(appointmentId);
        await tx`reset role`;

        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claim.sub',${doctorAuthId},true)`;
        await expect(
          tx.savepoint(async (sp) => {
            await sp`select public.book_clinic_appointment(${patientId}::uuid,
          ${slot.window_id}::uuid,${slot.practice_service_id}::uuid,
          'Unauthorized booking',${crypto.randomUUID()}::uuid)`;
          })
        ).rejects.toMatchObject({ code: "42501" });
        // Private tables cannot be read as authenticated; use the scoped projection.
        const projectedVersion = async () => {
          const [list] =
            await tx`select public.list_clinic_appointments(${practiceId}::uuid) as value`;
          return Number(
            list?.value?.find((a: { id: string }) => a.id === appointmentId)
              ?.row_version
          );
        };
        await tx`select public.transition_clinic_appointment(${appointmentId}::uuid,${await projectedVersion()}::bigint,'approve')`;
        await tx`select public.transition_clinic_appointment(${appointmentId}::uuid,${await projectedVersion()}::bigint,'check_in')`;
        await tx`select public.transition_clinic_appointment(${appointmentId}::uuid,${await projectedVersion()}::bigint,'start')`;
        await tx`select public.transition_clinic_appointment(${appointmentId}::uuid,${await projectedVersion()}::bigint,'complete','Signed fixture assessment')`;
        const [completed] =
          await tx`select public.list_clinic_appointments(${practiceId}::uuid) as value`;
        expect(
          completed?.value?.find((a: { id: string }) => a.id === appointmentId)
            ?.status
        ).toBe("completed");
        await tx`reset role`;

        await tx`set local role authenticated`;
        await tx`select set_config('request.jwt.claim.sub',${patientAuthId},true)`;
        const [patientView] =
          await tx`select public.list_clinic_appointments() as value`;
        expect(
          patientView?.value?.find(
            (a: { id: string }) => a.id === appointmentId
          )?.assessment
        ).toBe("Signed fixture assessment");
        await tx`reset role`;
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  },
  120000
);
