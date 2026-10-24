import type { useFacilityVerification } from "../hooks/useFacilityVerification";

export type FacilityAddressFieldsProps = Pick<
  ReturnType<typeof useFacilityVerification>,
  | "mapsApiKey"
  | "facilityAddress"
  | "setFacilityAddress"
  | "facilityLocality"
  | "setFacilityLocality"
  | "facilityCity"
  | "setFacilityCity"
  | "facilityState"
  | "setFacilityState"
  | "facilityPincode"
  | "setFacilityPincode"
  | "facilityLocation"
  | "mapUnavailable"
  | "locating"
  | "locationMessage"
  | "handleMapUnavailable"
  | "registering"
  | "applyLocation"
  | "useCurrentLocation"
>;
