import { afterAll, expect, test } from "bun:test";
import postgres from "postgres";

const url = process.env.TEST_DATABASE_URL;
const enabled =
  !!url &&
  process.env.ALLOW_DATABASE_TESTS ===
    "I_UNDERSTAND_THIS_IS_A_DISPOSABLE_DATABASE";

const db = enabled ? postgres(url!, { max: 1, prepare: false }) : undefined;
// Apply migrations with Supabase CLI before running this opt-in suite.
afterAll(async () => {
  await db?.end();
});
test.skipIf(!enabled)(
  "solo doctor permissions, tenant boundaries and immutable history in PostgreSQL",
  async () => {
    const [access] = await db!`
      select has_schema_privilege('anon', 'clinzo', 'USAGE') as private_access,
      has_function_privilege('anon', 'public.list_public_practices(integer)', 'EXECUTE') as directory_access`;
    expect(access?.private_access).toBe(false);
    expect(access?.directory_access).toBe(true);
    await db!.begin(async (tx) => {
      await tx`set local role anon`;
      const rows = await tx`select * from public.list_public_practices(1)`;
      expect(rows.length).toBeLessThanOrEqual(1);
    });
    const rollback = new Error("rollback_fixture");
    try {
      await db!.begin(async (tx) => {
        const actor = crypto.randomUUID(),
          org = crypto.randomUUID(),
          clinic = crypto.randomUUID();
        const clinician = crypto.randomUUID(),
          practice = crypto.randomUUID(),
          other = crypto.randomUUID();
        await tx`insert into clinzo.identity(id,issuer,subject,display_name) values(${actor},'urn:test',${actor},'Test doctor')`;
        await tx`insert into clinzo.organization(id,public_code,name,kind) values(${org},${org},'Test clinic','care_provider')`;
        await tx`insert into clinzo.facility(id,organization_id,public_code,name,kind,address,location)
        values(${clinic},${org},${clinic},'Test clinic','clinic','Synthetic',
        extensions.ST_SetSRID(extensions.ST_MakePoint(77.5,12.9),4326)::extensions.geography)`;
        await tx`insert into clinzo.doctor(id,identity_id,public_code,full_name,registration_authority,registration_number,practice_started_on,credential_status)
        values(${clinician},${actor},${clinician},'Test doctor','TEST',${clinician},'2022-01-01','verified')`;
        await tx`insert into clinzo.doctor_facility(id,doctor_id,facility_id) values(${practice},${clinician},${clinic})`;
        await tx`insert into clinzo.organization_member(identity_id,organization_id,role) values(${actor},${org},'owner')`;
        const [allowed] =
          await tx`select clinzo.can_manage_practice(${actor}::uuid,${practice}::uuid) as yes`;
        const [denied] =
          await tx`select clinzo.can_manage_practice(${other}::uuid,${practice}::uuid) as yes`;
        expect(allowed?.yes).toBe(true);
        expect(denied?.yes).toBe(false);
        await tx
          .savepoint(async (sp) => {
            await expect(
              sp`insert into clinzo.organization_member(identity_id,organization_id,role) values(${actor},${org},'owner')`
            ).rejects.toMatchObject({ code: "23505" });
            throw rollback;
          })
          .catch((error) => {
            if (error !== rollback) throw error;
          });
        const audit = crypto.randomUUID();
        await tx`insert into clinzo.audit_log(id,actor_kind,action,resource_type,request_id,outcome,metadata)
        values(${audit},'system','test','test',${audit},'allowed','{}')`;
        await tx
          .savepoint(async (sp) => {
            await expect(
              sp`update clinzo.audit_log set action='tampered' where id=${audit}`
            ).rejects.toMatchObject({ code: "23514" });
            throw rollback;
          })
          .catch((error) => {
            if (error !== rollback) throw error;
          });
        await tx`update clinzo.identity set display_name='Changed' where id=${actor}`;
        const [updated] =
          await tx`select row_version from clinzo.identity where id=${actor}`;
        expect(String(updated?.row_version)).toBe("2");
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
  },
  120000
);
