import type { DoctorCardProps } from "../components/DoctorCard";
import type { ConsultationType } from "../../appointments/types/appointment";
import type { PatientScreenProps } from "../../../types/screen";
import type { ProfileTab } from "../utils/doctorProfileConstants";

export type BookingSelection = {
  date: string;
  time: string;
  patient: string;
  patientId: string;
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
  bio: string | null;
  facilityName: string;
  facilityAddress: string;
  distanceMeters: number | null;
  languages: string[];
  onGoToSlots: () => void;
};

export type BookSlotsProps = {
  address?: string;
  consultationType: ConsultationType;
  onBookAppointment: (selection: BookingSelection) => void;
  onGoToAbout: () => void;
  slots: { window_id: string; starts_at: string }[];
  patientOptions: { id: string; label: string; verified: boolean }[];
  loading?: boolean;
  error?: string | null;
  busy?: boolean;
};
