import type { Appointment } from "./appointment";

import { StyleProp, TextStyle, ViewStyle } from "react-native";
import type { AppointmentStatus, VisitSessionMode } from "./appointment";
import type { PatientScreenProps } from "../../../types/screen";

export type BookingStatusScreenProps = PatientScreenProps & {
  appointment: Appointment;
  status: AppointmentStatus;
  onContinue: (mode: VisitSessionMode) => void;
};

export type ApprovedStatusProps = {
  label: string;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export type OnlineConsultationActionsProps = {
  onChatPress: () => void;
  onJoinPress: () => void;
};

export type OnlineScheduleCardProps = {
  appointment: Appointment;
};

export type PendingStatusProps = {
  onPreviewApproval?: () => void;
};
