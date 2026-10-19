# FixMySlop fix report

Date: 19 October 2026.

## Result and scope

The 53 findings in the pasted brief were checked against their current owners. The requested rule/file combinations no longer appear in the scanner report. The edits cover 49 files because several original screens have been split into components and constants since the supplied report.

The full repository scan is **not clean**: FixMySlop 0.6.7 still reports 102 findings that are outside the supplied item list (score 5.1, grade A). These were not suppressed or used as a reason to broaden the change. The first available local scan, taken after the initial mobile accessibility corrections, reported 130 findings; it is not a pristine before-change baseline.

No application functionality, route, mutation, or rating value was removed. Native appearance, screen-reader behavior, and browser keyboard behavior still require interactive verification.

## Current owners and already-resolved findings

- The old apps/web paths now belong to apps/facility-portal.
- Driver RegistrationScreens.tsx is now a compatibility export. Its findings were fixed in the individual registration screens, shared registration styles, and ProfilePhotoButton.
- The two Tracking.tsx image findings share DriverTrackingMap, used by pickup tracking and the hospital journey.
- The two FindDoctorScreen.tsx image findings now belong to FindDoctorCategories and FindDoctorSearchList.
- The current LoginForm already links signup to /register and contains none of the four reported dead links. It was left unchanged.
- Native images with existing accessibilityLabel text were expressed with React Native's alt prop. Redundant artwork uses alt="" while its surrounding text/control remains named. No ignore comments were added for the supplied findings.

## Verification

| Check                         | Before                                                                        | After                                                           |
| ----------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Doctor typecheck              | Pass                                                                          | Pass                                                            |
| Driver typecheck              | Pass                                                                          | Pass                                                            |
| Facility typecheck            | Pass                                                                          | Pass                                                            |
| Patient typecheck             | One existing completedBooking possibly undefined error                        | Same error                                                      |
| Shared web UI typecheck       | Existing missing react-day-picker/cmdk/vaul declarations and chart key errors | Same diagnostics                                                |
| Doctor tests                  | 58 pass                                                                       | 58 pass                                                         |
| Driver tests                  | 12 CommonJS tests passed                                                      | Full package suite: 16 pass, including the existing store tests |
| Facility tests                | 35 pass                                                                       | 38 pass, including the three new chart security cases           |
| Shared web UI tests           | 4 pass                                                                        | 4 pass                                                          |
| Patient tests                 | 30 pass, 17 fail                                                              | Same 30 pass and same 17 failing test names                     |
| Facility architecture checker | Pass during baseline lint                                                     | Pass                                                            |
| Facility lint                 | 43 errors, 1 warning                                                          | Same totals                                                     |
| Root lint                     | Stale generated design-token theme.css                                        | Same existing gate                                              |
| Root test                     | Turbo cannot find a test task                                                 | Same existing gate                                              |
| Root typecheck                | Shared web UI errors; database issued possibly undefined error                | Same existing gates                                             |
| Facility production build     | Pass outside sandbox                                                          | See final build result below                                    |
| Touched-file Prettier         | Checked after changes                                                         | Pass                                                            |
| Diff whitespace check         | Checked against saved pre-edit sources                                        | Pass                                                            |

The Patient type error is in apps/patient-mobile/src/features/ambulance/hooks/useAmbulanceBooking.ts. Existing Facility lint errors include BedCountStepper's effect and CommonJS test imports. Initial sandbox-only path access failures were resolved by running validation outside the sandbox; they are not counted as application regressions.

## File-by-file changes

| File                                                                                     | Change                                                                                                                                              |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/doctor-mobile/src/features/consultations/screens/HomeVisitScreen.tsx`              | Use React Native alt for the existing reference-map description.                                                                                    |
| `apps/driver-mobile/src/features/auth/components/Registration.styles.ts`                 | Replace registration colors with shared Driver/neutral/error tokens and the shared shadow; remove the decorative red benefit variant.               |
| `apps/driver-mobile/src/features/auth/screens/DetailsScreen.tsx`                         | Use shared text, surface, and border tokens for the address field.                                                                                  |
| `apps/driver-mobile/src/features/auth/screens/DocumentsScreen.tsx`                       | Use the Driver accent for the selected vehicle class and its icon.                                                                                  |
| `apps/driver-mobile/src/features/auth/screens/VerificationScreen.tsx`                    | Mark the redundant verification illustration as decorative.                                                                                         |
| `apps/driver-mobile/src/features/auth/screens/WelcomeScreen.tsx`                         | Mark the hero artwork as decorative and use the Driver accent for every benefit icon.                                                               |
| `apps/driver-mobile/src/features/auth/utils/registrationConstants.ts`                    | Resolve the registration accent from the existing Driver token.                                                                                     |
| `apps/driver-mobile/src/features/home/screens/HomeScreen.tsx`                            | Use React Native alt for the existing reference-map description.                                                                                    |
| `apps/driver-mobile/src/features/profile/screens/ProfileScreen.tsx`                      | Name the driver's profile photo for assistive technology.                                                                                           |
| `apps/driver-mobile/src/features/trips/screens/TripScreen.tsx`                           | Use React Native alt for the existing reference-route description.                                                                                  |
| `apps/facility-portal/src/components/admin/admin-layout.tsx`                             | Use the existing background token for both admin shell surfaces.                                                                                    |
| `apps/facility-portal/src/components/admin/app-sidebar.tsx`                              | Use semantic theme colors and standard type/radius classes; resolve width from the existing sidebar variable.                                       |
| `apps/facility-portal/src/features/appointments/components/AppointmentsSummaryCards.tsx` | Replace hardcoded UI colors and one-off typography/radii with existing theme classes; preserve data and event handlers.                             |
| `apps/facility-portal/src/features/appointments/components/AppointmentsTable.tsx`        | Replace hardcoded UI colors and one-off typography/radii with existing theme classes; preserve data and event handlers.                             |
| `apps/facility-portal/src/features/appointments/screens/AppointmentsScreen.tsx`          | Use theme colors and standard type/radius classes, and add visible focus rings to controls with removed outlines; preserve data and event handlers. |
| `apps/facility-portal/src/features/dashboard/screens/DashboardScreen.tsx`                | Use theme colors and standard type/radius classes, and add visible focus rings to controls with removed outlines; preserve data and event handlers. |
| `apps/facility-portal/src/features/dashboard/utils/dashboardConstants.ts`                | Use theme classes for the existing display/status mappings; preserve records, labels, and schedule meanings.                                        |
| `apps/facility-portal/src/features/doctors/components/AddDoctorAction.tsx`               | Replace hardcoded UI colors and one-off typography/radii with existing theme classes; preserve data and event handlers.                             |
| `apps/facility-portal/src/features/doctors/components/AddDoctorCard.tsx`                 | Use theme colors and standard type/radius classes, and add visible focus rings to controls with removed outlines; preserve data and event handlers. |
| `apps/facility-portal/src/features/doctors/components/DoctorAssignmentsTable.tsx`        | Replace hardcoded UI colors and one-off typography/radii with existing theme classes; preserve data and event handlers.                             |
| `apps/facility-portal/src/features/doctors/components/doctorColumns.tsx`                 | Replace hardcoded UI colors and one-off typography/radii with existing theme classes; preserve data and event handlers.                             |
| `apps/facility-portal/src/features/doctors/components/DoctorSchedulesStats.tsx`          | Replace hardcoded UI colors and one-off typography/radii with existing theme classes; preserve data and event handlers.                             |
| `apps/facility-portal/src/features/doctors/components/DoctorShiftGantt.tsx`              | Replace hardcoded UI colors and one-off typography/radii with existing theme classes; preserve data and event handlers.                             |
| `apps/facility-portal/src/features/doctors/screens/DoctorManagementScreen.tsx`           | Use theme colors and standard type/radius classes, and add visible focus rings to controls with removed outlines; preserve data and event handlers. |
| `apps/facility-portal/src/features/doctors/screens/DoctorSchedulesScreen.tsx`            | Replace hardcoded UI colors and one-off typography/radii with existing theme classes; preserve data and event handlers.                             |
| `apps/facility-portal/src/features/doctors/utils/doctorSchedulesConstants.ts`            | Use theme classes for the existing display/status mappings; preserve records, labels, and schedule meanings.                                        |
| `apps/facility-portal/src/features/facilities/screens/BedManagementScreen.tsx`           | Use theme colors and standard type/radius classes, and add visible focus rings to controls with removed outlines; preserve data and event handlers. |
| `apps/patient-mobile/src/features/ambulance/components/AmbulanceCompletion.tsx`          | Render Lucide rating icons while retaining the five labels, selected states, and zero-based rating submission values.                               |
| `apps/patient-mobile/src/features/ambulance/components/DriverTrackingMap.tsx`            | Use React Native alt for the fallback image shared by both tracking stages; preserve native maps and location behavior.                             |
| `apps/patient-mobile/src/features/ambulance/components/PickupMap.tsx`                    | Describe the map as illustrative rather than a live GPS position.                                                                                   |
| `apps/patient-mobile/src/features/ambulance/utils/ambulanceCompletionConstants.ts`       | Replace five emoji entries with matching Lucide icon components; retain order and labels.                                                           |
| `apps/patient-mobile/src/features/consultations/components/CompletionView.styles.ts`     | Remove the text-only rating glyph style after replacing its caller with icons.                                                                      |
| `apps/patient-mobile/src/features/consultations/components/CompletionView.tsx`           | Render Lucide rating icons while retaining labels, selected states, and one-based rating submission values.                                         |
| `apps/patient-mobile/src/features/consultations/components/QueueStatus.tsx`              | Mark the queue-seat artwork as decorative; keep the actual queue information in text.                                                               |
| `apps/patient-mobile/src/features/consultations/utils/consultationConstants.ts`          | Replace five emoji entries with matching Lucide icon components; retain order and labels.                                                           |
| `apps/patient-mobile/src/features/doctors/components/DoctorCard.tsx`                     | Render the existing rating star with Lucide and remove the obsolete text-glyph style.                                                               |
| `apps/patient-mobile/src/features/doctors/components/FindDoctorCategories.tsx`           | Hide decorative category images from separate screen-reader announcements; keep each button's category name.                                        |
| `apps/patient-mobile/src/features/doctors/components/FindDoctorSearchList.tsx`           | Hide decorative result images from separate screen-reader announcements; keep each row's accessible name.                                           |
| `apps/patient-mobile/src/features/home/components/AmbulanceBanner.tsx`                   | Mark the ambulance illustration as decorative alongside its existing text and booking control.                                                      |
| `apps/patient-mobile/src/features/home/screens/HomeScreen.tsx`                           | Remove the decorative waving-hand emoji from the greeting.                                                                                          |
| `packages/mobile-ui/src/primitives/ProfilePhotoButton.tsx`                               | Mark the nested photo as decorative because its parent already names the profile-photo action/image.                                                |
| `packages/web-ui/src/components/data-table.tsx`                                          | Replace hardcoded UI colors and one-off typography/radii with existing theme classes; preserve data and event handlers.                             |
| `packages/web-ui/src/components/ui/alert-dialog.tsx`                                     | Restore a visible theme-based focus ring and offset on focused dialog content.                                                                      |
| `packages/web-ui/src/components/ui/chart.tsx`                                            | Render generated CSS as React text; escape chart selectors and reject injected CSS declarations and variable names.                                 |
| `packages/web-ui/src/components/ui/command.tsx`                                          | Restore a visible theme-based focus ring and offset on a focused command list.                                                                      |
| `packages/web-ui/src/components/ui/dialog.tsx`                                           | Restore a visible theme-based focus ring and offset on focused dialog content.                                                                      |
| `packages/web-ui/src/components/ui/tabs.tsx`                                             | Restore a visible theme-based focus ring and offset on a focused tab panel.                                                                         |
| `packages/web-ui/src/components/virtual-list.tsx`                                        | Replace hardcoded UI colors and one-off typography/radii with existing theme classes; preserve data and event handlers.                             |
| `apps/facility-portal/tests/unit/chart-style.test.mjs`                                   | Add three SSR regression tests for light/dark chart colors, CSS declaration injection, and selector/style-tag breakout attempts.                    |

## Remaining full-scan findings outside the supplied list

| Rule                      | Count |
| ------------------------- | ----- |
| `slop/duplicate-function` | 36    |
| `slop/empty-catch`        | 19    |
| `ui/arbitrary-color`      | 17    |
| `a11y/img-alt`            | 10    |
| `sec/public-env-secret`   | 6     |
| `a11y/icon-button`        | 4     |
| `ui/aphorism-copy`        | 4     |
| `deps/phantom-import`     | 1     |
| `slop/empty-test`         | 1     |
| `ui/z-index-war`          | 1     |
| `a11y/focus-removed`      | 1     |
| `ui/off-scale-values`     | 1     |
| `ui/palette-sprawl`       | 1     |

The palette and off-scale rules now point to AmbulancePayment and NewAppointmentDialog rather than the files named in the supplied brief. One pre-existing empty catch remains in the touched CompletionView file; empty-catch was not one of its supplied findings. The scan also includes public-environment-name warnings, which are not a confirmed credential leak. No credential was changed or newly introduced by these UI fixes.

No manual font, image, or testimonial assets are required for the supplied fixes. Existing typecheck, lint, and test failures and the wider scan backlog remain separate work.

Local evidence is saved under .expo/fixmyslop-20261019, including the before-source snapshots, full scanner JSON, and baseline/after check logs. The isolated scanner environment is under that ignored directory; package.json and the pnpm lockfile were not changed.

## Final production build

Root production build passed for Facility Portal and Company Admin.
