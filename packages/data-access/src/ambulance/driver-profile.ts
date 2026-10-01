import {
  driverProfileInputSchema,
  driverProfileSchema,
  driverVehicleSubmissionSchema,
  driverRegistrationDetailsSchema,
  driverRegistrationApplicationSchema,
  driverRegistrationSubmissionSchema,
} from "@startup/contracts";
import type {
  DriverProfileInput,
  DriverVehicleSubmission,
  DriverRegistrationDetails,
  DriverRegistrationSubmission,
} from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function getMyDriverProfile(client: AppSupabaseClient) {
  const { data, error } = await client.rpc("get_my_driver_profile");
  if (error) throw error;
  return data === null ? null : driverProfileSchema.parse(data);
}

export async function updateMyDriverProfile(
  client: AppSupabaseClient,
  input: DriverProfileInput
) {
  const value = driverProfileInputSchema.parse(input);
  const { data, error } = await client.rpc("update_my_driver_profile", {
    p_profile: {
      full_name: value.fullName,
      date_of_birth: value.dateOfBirth,
      city: value.city,
      contact_phone: value.contactPhone ?? "",
      profile_photo_path: value.profilePhotoPath ?? "",
      consent: value.consent,
    },
  });
  if (error) throw error;
  return driverProfileSchema.parse(data);
}

export async function submitMyDriverVehicle(
  client: AppSupabaseClient,
  input: DriverVehicleSubmission
) {
  const value = driverVehicleSubmissionSchema.parse(input);
  const { data, error } = await client.rpc("submit_my_driver_vehicle", {
    p_details: {
      registration_number: value.vehicle.registrationNumber,
      display_label: value.vehicle.displayLabel,
      inspection_expires_on: value.vehicle.inspectionExpiresOn,
      capability_code: value.vehicle.capabilityCode,
      equipment_notes: value.vehicle.equipmentNotes,
      crew_notes: value.vehicle.crewNotes,
    },
    p_documents: value.documents,
  });
  if (error) throw error;
  return data as string;
}

export async function getMyDriverRegistrationApplication(
  client: AppSupabaseClient
) {
  const { data, error } = await client.rpc(
    "get_my_driver_registration_application"
  );
  if (error) throw error;
  return data === null ? null : driverRegistrationApplicationSchema.parse(data);
}

export async function saveMyDriverRegistrationDetails(
  client: AppSupabaseClient,
  input: DriverRegistrationDetails
) {
  const value = driverRegistrationDetailsSchema.parse(input);
  const { data, error } = await client.rpc(
    "save_my_driver_registration_details",
    {
      p_details: {
        full_name: value.fullName,
        contact_phone: value.contactPhone,
        date_of_birth: value.dateOfBirth,
        city: value.city,
        profile_photo_path: value.profilePhotoPath ?? "",
        consent: value.consent,
      },
    }
  );
  if (error) throw error;
  return driverRegistrationApplicationSchema.parse(data);
}

export async function submitMyDriverRegistrationApplication(
  client: AppSupabaseClient,
  input: DriverRegistrationSubmission
) {
  const value = driverRegistrationSubmissionSchema.parse(input);
  const { data, error } = await client.rpc(
    "submit_my_driver_registration_application",
    {
      p_vehicle: {
        capability_code: value.capabilityCode,
        registration_number: value.registrationNumber,
      },
      p_documents: value.documents,
    }
  );
  if (error) throw error;
  return driverRegistrationApplicationSchema.parse(data);
}
