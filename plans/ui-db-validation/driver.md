# Driver workflow cross-validation

All six driver screen modules and route/store adapters were traced: registration → verification → availability/offer → pickup/PIN/trip/completion → messaging → earnings/history/profile. Source services for Supabase/location/notifications are empty. Figma node references are recorded in apps/driver-mobile/README.md and the shared Figma inventory.

## UI → source → database → API → owner

| UI field/action                                          | Actual source                                      | Intended source/ownership                                                              | Gap                                                                                                             |
| -------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Full name/mobile/DOB/city/photo                          | RegistrationScreens DriverProfile, in-memory store | driver.full_name; Auth verified phone; DOB/city/photo absent                           | Profile API and private photo storage; never store driver DOB in patient profile                                |
| Verification consent                                     | Component checkbox, discarded on save              | Versioned consent with identity and timestamp                                          | Consent record/retention and submission command missing                                                         |
| Independent/invited operator                             | No branch                                          | Confirmed both paths; driver.organization_id                                           | Existing-operator invite/accept workflow absent; independent operator creation must be explicit                 |
| BLS/ALS/NICU, registration                               | documents store                                    | vehicle.registration_number; capability catalog and verified vehicle_capability        | Classification-to-capability rule and expiry/review missing                                                     |
| Aadhaar/PAN/license/RC/insurance/fitness/photo/equipment | Local file picker metadata                         | Private typed document submission/review links to driver or vehicle                    | No document evidence/review model or upload policy; license number/expiry mandatory DB values missing from form |
| Pending/verified                                         | Local booleans/Preview verified action             | driver.verification_status; credential reviewer owns approval                          | No live self-approval; suspended/rejected/changes-requested/renewal UI missing                                  |
| Online/offline                                           | driver store boolean                               | driver_shift desired_availability + eligibility                                        | Toggle is not shift identity; require valid driver/vehicle/crew/location/license                                |
| Today trips/earnings/acceptance/rating/online hours      | Sample/session aggregates/placeholders             | Completed trips/final quotes, offer results, published reviews, availability intervals | Timezone/denominator/gross-vs-net definitions missing; derive, not independent columns                          |
| Offer countdown/distance/pickup/patient/hospital/fare    | Static emergency fixture and local deadline        | dispatch_offer expiry/distance; booking snapshots; fare_quote                          | Driver-scoped offer API/private events; server expiry and competition required                                  |
| Contact/navigation/ETA/map/speed                         | Static map/values and call placeholder             | Assigned booking contact and coordinates; GPS stream + external routing                | Masking/contact access, location permission/consent, routing provider and freshness absent                      |
| Patient PIN                                              | Demo credential in local state                     | patient_ambulance_pin verifier + pin_attempt + trip start authorization                | Rate-limited assigned-driver verification; no plaintext server return; locked/reset/override UI needed          |
| Trip state/timestamps                                    | Local guarded transitions                          | trip status and assignment history                                                     | Arrived-destination/cancelled/reassignment/handover must be represented                                         |
| Completion fare/distance/duration                        | Fixture data                                       | Final fare_quote, trip.distance_meters and timestamps                                  | Duration derived, fare system-generated; trip complete ≠ payment confirmed                                      |
| Chat text/time/checkmarks/quick replies                  | Local messages                                     | No message/conversation/participant model/provider                                     | Scoped delivery/read/error states and retention needed; draft/templates client-only                             |
| Earnings/history filters                                 | In-memory trips and sum of gross fare              | Driver assignment → final quote/payment; payouts not modeled                           | Gross/collected/net policy OPEN; don't label fare sum as settled income                                         |
| Profile edits/support                                    | Local fields/static contact                        | Driver-owned declared profile, operator support settings                               | Re-verification on sensitive changes, authorized update and support ownership missing                           |

## Required actions and cross-app effects

- **Submit/review:** verified Auth → independent or invitation enrollment → validate evidence/consent → private uploads/submission → authorized reviewer → driver/vehicle status and audit/event → driver's eligibility and operator review queue. No direct user-controlled verification flags.
- **Go online:** authenticated own driver + active eligible vehicle/crew/service area → unique active shift → availability → dispatch candidates. Expired credentials and suspended driver must visibly block the action.
- **Accept/reject/expire:** offer belongs to driver's shift; server deadline; booking still searchable → lock + unique booking/driver/vehicle assignment → accepted offer/matched round/assigned booking/trip → withdraw competitors → patient and drivers refresh. Rejection and expiry remain distinct metrics.
- **Arrive/start:** assigned driver and allowed state → arrival → PIN verification or approved emergency override → trip start timestamp/auth version/attempt audit → patient tracker/operator.
- **Location:** active shift+assignment, epoch/sequence/accuracy/age → latest and sampled history → private projection → patient/operator map. Reconnect refetches; stale location is never shown as fresh.
- **Complete/handoff:** permitted destination-arrival/handover → trip/booking completion + assignment release + final quote → patient receipt/payment/review and driver history. Patient care must not be gated on payment completion.
- **Collect/confirm/refund:** assigned collector or authenticated signed provider callback → amount/currency/final quote/idempotency → payment state/event → receipt and collection summary. No current driver payment confirmation UI.
- **Send/call:** authorized current participant → conversation/contact provider → durable/safely retained message or session → counterpart/read status. Current local chat never reaches patient.

## Reverse gaps and cardinality

Required driver.organization_id/license_number/license_expires_on, vehicle.display_label/inspection_expires_on, capability verified/expiry and shift crew/service-area requirements have no complete operating UI. Add operator/reviewer controls or documented, confirmed policies; never manufacture these values.

Driver↔vehicle is N:M over time via shifts, one active shift per driver/vehicle. Booking→assignments is history 1:N with one active assignment. Booking→trip is currently at most one; reassignment after trip start needs an explicit rule before adding replacement trips. Organization owns vehicles; facility staging/assignment is not modeled and remains open.

Offer withdrawn/expired, trip cancelled/arrived_at_destination, unknown guest patient/destination, emergency no-PIN override, changed destination/re-route, credential suspension and payment failure/refund require UI. Backend-only: PIN verifier/pepper, raw attempts, outbox leases/retries, location sequence internals and audit storage.

## Findings and evidence

| Finding                           | Evidence under apps/driver-mobile/src                         | Impact                                                          | Effort | Risk | Confidence |
| --------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- | ------ | ---- | ---------- |
| No shared driver workflow API     | stores/driver.ts:96–140; empty services                       | No cross-app persistence/authorization                          | L      | High | High       |
| Missing evidence/enrollment model | RegistrationScreens.tsx:38,346; schema ambulance-workforce.ts | Cannot persist submitted documents or required enrollment facts | L      | High | High       |
| Emergency/terminal states omitted | stores/driver.ts:10,119–135; schema trips.ts                  | Guest no-PIN/cancellation/handover unsupported                  | L      | High | High       |
| Chat and earnings undefined       | ChatScreen.tsx:18,65; EarningsScreen.tsx:16–24                | No message truth or settled-income semantics                    | L      | High | High       |

No driver workflow is fully aligned. Independent/invited enrollment and mobile phone OTP are now confirmed. Reviewer authority, provider choices, document retention, payout semantics, capability policy and emergency reassignment remain open. No live SMS, driver tracking, database mutation or native-device test was performed in this read-only review.
