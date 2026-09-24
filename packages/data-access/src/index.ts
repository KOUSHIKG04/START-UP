export {
  createSupabaseClient,
  type AppSupabaseClient,
} from "./client/createSupabaseClient";
export { listPublicPractices } from "./doctors/queries";
export { searchPublicPractices, getPublicPracticeBio } from "./doctors/queries";
export * from "./doctors/operations";
export * from "./auth/operations";
export * from "./auth/mobileSession";
export * from "./auth/secureSessionStorage";
export * from "./clinic/operations";
export * from "./clinical/operations";
export * from "./ambulance/operations";
export * from "./ambulance/driver-fleet";
export * from "./ambulance/trip";
export * from "./ambulance/tracking";
export * from "./ambulance/sos";
export * from "./facilities/operations";
export type { Database } from "./generated/database.types";
