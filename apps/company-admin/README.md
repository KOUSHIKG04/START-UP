# Company Admin

This is the internal Next.js review site. It runs separately from `apps/facility-portal` (the hospital/clinic portal) on port 3001 and uses the same `@startup/web-ui` shadcn components, design tokens, TanStack Table, and TanStack Query provider. The current queue is server-rendered, with table sorting and pagination handled by TanStack Table; add Query hooks only for future client-side live interactions.

## Local setup

1. Copy `.env.example` to `.env.local` and enter the **disposable project's** URL and publishable key. Never put a Supabase secret/service-role key in this app.
2. In the disposable project's Authentication → Users page, create a **verified email/password Auth user** with email `clinzoadmin@example.com` and a password you choose. Do not reuse a patient, doctor, driver, or facility account. Keep the password private and out of the repository.
3. In the disposable project's SQL editor, run the reviewer-grant SQL below. The reviewer role has no self-service signup.
4. Run `pnpm --filter company-admin dev` from `C:\startup` and open `http://localhost:3001`.

Run `pnpm --filter company-admin test:e2e` for the anonymous-access Playwright check. It builds the app, starts a temporary production server on port 3001, and stops it afterward; use `test:e2e:ui` for the Playwright UI. The test does not create or review documents.

If you run Playwright directly rather than through `test:e2e`, use two PowerShell terminals:

```powershell
# Terminal 1
pnpm --filter company-admin start

# Terminal 2
$env:PLAYWRIGHT_EXTERNAL_SERVER = "1"
pnpm --filter company-admin exec playwright test
Remove-Item Env:PLAYWRIGHT_EXTERNAL_SERVER
```

Build first with `pnpm --filter company-admin build` if `.next` does not exist. The external-server mode tests the same routes without having Playwright manage the Next.js process.

```sql
begin;
with account as (
  select id from auth.users
  where lower(email)=lower('clinzoadmin@example.com')
    and email_confirmed_at is not null
    and (banned_until is null or banned_until < now())
), linked as (
  insert into clinzo.identity(issuer,subject,display_name)
  select 'supabase',id::text,'Company Reviewer' from account
  on conflict (issuer,subject) do update set display_name=excluded.display_name
  returning id
)
insert into clinzo.company_reviewer(identity_id)
select id from linked
on conflict(identity_id) do update set active=true;
commit;
```

The SQL inserts nothing if the Auth user is missing or unconfirmed. Check that exactly one active reviewer row exists before signing in:

```sql
select u.email, r.active
from auth.users u
join clinzo.identity i on i.issuer = 'supabase' and i.subject = u.id::text
join clinzo.company_reviewer r on r.identity_id = i.id
where lower(u.email) = lower('clinzoadmin@example.com');
```

To change the password later on the disposable project, run `packages/database/tooling/set-disposable-reviewer-password.ps1 -KeyFromClipboard` after setting `TEST_PROJECT_REF=enjafragbcrrgaclwopd`; it prompts privately for the new password. Revoke access with `update clinzo.company_reviewer set active=false where identity_id=...` from trusted SQL. Company reviewer access is checked both in the Next.js route layout and the database RPCs.

Doctor evidence comes from `doctor-licenses`; driver evidence from `driver-evidence`; facility evidence from `facility-evidence`. All are private. Reviewers receive 60-second signed preview URLs only for paths in verification cases. Facility owners/admins submit a registration certificate and operating licence from the existing portal's Facility Verification route. The doctor and driver waiting screens show rejection reasons and link back to their existing submission flows.

The database records notification intents when a review decision changes, but `supabase/functions/send-notification/index.ts` is still empty. Push/email delivery is **not** active yet. The doctor/driver/facility apps retrieve their current review status directly, including rejection reasons. Do not describe outbound notifications as working until a delivery worker is implemented and tested.

The disposable-project migration validation used `pnpm supabase db push --project-ref enjafragbcrrgaclwopd`. The linked project `ilbnouxjyurkmsviwbfd` was not used for these migrations.
