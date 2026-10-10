export {
  createSupabaseClient,
  type AppSupabaseClient,
} from "./client/createSupabaseClient";
export { listPublicPractices } from "./doctors/queries";
export { searchPublicPractices, getPublicPracticeBio } from "./doctors/queries";
export * from "./doctors/operations";
export * from "./doctors/schedule";
export * from "./doctors/onboarding";
export * from "./doctors/reviews";
export * from "./auth/operations";
export * from "./patients/profiles";
export * from "./profiles/photos";
export * from "./patients/locations";
export * from "./auth/mobileSession";
export * from "./auth/secureSessionStorage";
export * from "./notifications/operations";
export * from "./clinic/operations";
export * from "./clinical/operations";
export * from "./ambulance/operations";
export * from "./ambulance/driver-fleet";
export * from "./ambulance/driver-profile";
export * from "./ambulance/trip";
export * from "./ambulance/tracking";
export * from "./ambulance/sos";
export * from "./facilities/operations";
export * from "./facilities/doctors";
export * from "./facilities/association";
export type { Database } from "./generated/database.types";
export * from "./verification/operations";
export * from "./verification/my-case";
export * from "./online/operations";

export * from "./doctors/locations";
export * from "./drivers/locations";
