import type { ReactNode } from "react";
import { type StyleProp, type TextStyle } from "react-native";

import { type ViewStyle } from "react-native";
import type { AmbulanceType } from "../utils/ambulanceConstants";

import type { AmbulanceHospital } from "@startup/contracts";

export type HospitalItem = AmbulanceHospital;

import type { GoogleHospital, PublicHospital } from "@startup/contracts";

export type AmbulanceBookingFormProps = {
  destination: string;
  onDestinationChange: (dest: string) => void;
  hospitalId: string | null;
  onSelectHospital: (hospital: AmbulanceHospital) => void;
  locatingPickup: boolean;
  pickup: { latitude: number; longitude: number } | null;
  pickupAddress: string;
  onPickupAddressChange: (value: string) => void;
  googleHospitals: GoogleHospital[];
  isGoogleLoading: boolean;
  searching: boolean;
  onSearchingChange: (searching: boolean) => void;
  onCurrentLocationPress: () => void;
  hospitalsData: PublicHospital[];
  isHospitalsLoading: boolean;
  isHospitalsError: boolean;
  emergency: boolean;
  onEmergencyChange: (val: boolean) => void;
  type: AmbulanceType["id"];
  onTypeChange: (type: AmbulanceType["id"]) => void;
  isRequestPending: boolean;
  isBookingsLoading: boolean;
  hasActiveBooking: boolean;
  onRequestBooking: () => void;
};

export type ActionButtonProps = {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export type AmbulanceOptionProps = {
  item: AmbulanceType;
  selected: boolean;
  onPress: () => void;
};

export type EmergencyModeCardProps = {
  emergency: boolean;
  onEmergencyChange: (val: boolean) => void;
  style?: StyleProp<ViewStyle>;
};

export type LocationFieldsProps = {
  destination: string;
  pickupAddress: string;
  locating?: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onCurrentLocationPress: () => void;
};

export type PickupMapProps = {
  destination: string;
  onConfirm: () => void;
  address: string;
  onAddressChange: (value: string) => void;
};

export type SectionTitleProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
};

export type HospitalCardProps = {
  hospital: HospitalItem;
  selected: boolean;
  onPress: (hospital: HospitalItem) => void;
};
