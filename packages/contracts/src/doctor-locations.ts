export {
  savedPatientLocationInputSchema as savedDoctorLocationInputSchema,
  savedPatientLocationSchema as savedDoctorLocationSchema,
} from "./patient-locations";
export type {
  SavedPatientLocationInput as SavedDoctorLocationInput,
  SavedPatientLocation as SavedDoctorLocation,
} from "./patient-locations";

import { z } from "zod";
import { savedPatientLocationInputSchema } from "./patient-locations";

export const doctorPersonalAddressInputSchema =
  savedPatientLocationInputSchema.refine(
    (value) =>
      value.kind === "house" &&
      (value.building?.length ?? 0) >= 2 &&
      (value.locality?.length ?? 0) >= 2 &&
      (value.city?.length ?? 0) >= 2 &&
      (value.state?.length ?? 0) >= 2 &&
      Boolean(value.pincode),
    {
      message:
        "Complete your personal address, locality, city, state and pincode.",
    }
  );
export type DoctorPersonalAddressInput = z.infer<
  typeof doctorPersonalAddressInputSchema
>;
