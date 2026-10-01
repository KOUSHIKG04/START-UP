# Online consultation: disposable-project device test

Scope: disposable Supabase project `enjafragbcrrgaclwopd` only. The linked project `ilbnouxjyurkmsviwbfd` is separate. No video credentials belong in the mobile apps or Git.

## What is connected

- A verified doctor with saved online schedule settings can publish online slots. The established booking RPC owns capacity and confirmation; online bookings are tagged `visit_mode = online` by the database.
- Patient and doctor appointment lists show the online booking. The doctor starts the consultation; both participants can join during the scheduled window, exchange stored messages, and use camera/microphone. Only the appointment doctor can sign an assessment and complete it.
- `online-video-token` checks the signed-in user against the appointment before issuing a short-lived LiveKit room token. It has been deployed only to the disposable project. Until the secrets below exist, it returns `Video service is not configured`.

## One-time LiveKit setup

1. Create a LiveKit Cloud project at [LiveKit Cloud](https://cloud.livekit.io/). In that project, find its WebSocket server URL (`wss://...`), API key, and API secret.
2. In the [disposable Supabase project's Edge Function secrets](https://supabase.com/dashboard/project/enjafragbcrrgaclwopd/settings/functions), set `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`. Keep the API secret server-side. Do not put it in any `EXPO_PUBLIC_*` variable or chat message.
3. The function is already deployed. If its code changes, from `C:\startup` run `pnpm supabase functions deploy online-video-token --project-ref enjafragbcrrgaclwopd`.

## Native test builds

LiveKit's native WebRTC code cannot run in Expo Go. Install **new** development builds containing the added plugins on two Android devices (or Android/iOS devices):

```powershell
cd C:\startup\apps\patient-mobile
eas build --platform android --profile development

cd C:\startup\apps\doctor-mobile
eas build --platform android --profile development
```

Install each generated APK. Both development builds must use the disposable Supabase environment. For local Metro sessions run `pnpm exec expo start --dev-client --tunnel` from each app directory, in separate terminals. Follow the EAS build page to install a build on a device. iOS needs its own EAS development build and Apple device provisioning.

## Two-device sequence

1. Sign in to the Doctor App with a **verified** disposable doctor. Ensure their practice is active. In Schedule, save online daily limit greater than zero and an online fee. Publish online slots on a future working date. If clinic slots already occupy those hours, choose a date without overlapping published clinic hours.
2. Sign in to the Patient App with a disposable patient. Search for online doctors, open the doctor's existing Details page, choose one of the published online slots, and book it. If auto-confirm is off, the appropriate clinic/facility admin must accept the request. Check that both apps show a confirmed **Online** appointment; the database row must have `visit_mode = 'online'`.
3. Within 15 minutes before the slot start, open chat on both apps. Send a message in each direction; it should persist and appear in the other app. An unrelated account must not be able to read or join that appointment.
4. The doctor taps **Start consultation**, then both tap **Join video consultation**. Allow microphone and camera permissions. Verify bidirectional audio/video, mute, camera switch, and ending a call. A poor or denied permission should leave chat and booking data usable.
5. Doctor opens Clinical Notes, enters an assessment, and signs completion. Both appointment lists should show completed status and patient-facing records should show the signed note through the existing clinical path.

The database migration and rollback test can be rerun only against the disposable project:

```powershell
cd C:\startup
$env:TEST_PROJECT_REF = 'enjafragbcrrgaclwopd'
& .\packages\database\tooling\verify-disposable.ps1 -UseCli
& .\node_modules\.bin\supabase.ps1 db query --linked --project-ref enjafragbcrrgaclwopd --file packages/database/tooling/online-consultation.cli-smoke.sql --output-format json --agent no
```

The SQL smoke test creates temporary fixture users/appointments/messages in a transaction and rolls them back. It does not verify media transport; that requires the two-device test above.
