import type { DoctorCardProps } from "../components/DoctorCard";
import type { ConsultationType } from "./appointment";
import type { PatientScreenProps } from "./screen";
import type { ProfileTab } from "../utils/doctorProfileConstants";

export type BookingSelection = {
  date: string;
  time: string;
  patient: string;
  reason: string;
  consultationType: ConsultationType;
  address?: string;
};

export type DoctorProfileScreenProps = PatientScreenProps & {
  doctor: DoctorCardProps;
  consultationType: ConsultationType;
  onBookAppointment: (selection: BookingSelection) => void;
};

export type OnlineConsultationProps = {
  fee: string;
  onBookPress: () => void;
};

export type ProfileTabsProps = {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
};

export type HomeVisitAddressProps = {
  address: string;
  onAddressChange: (address: string) => void;
  onConfirm: () => void;
  verifiedAddress: string;
};

export type AboutDoctorProps = {
  doctorName: string;
  onGoToSlots: () => void;
};

export type BookSlotsProps = {
  address?: string;
  consultationType: ConsultationType;
  onBookAppointment: (selection: BookingSelection) => void;
  onGoToAbout: () => void;
};
