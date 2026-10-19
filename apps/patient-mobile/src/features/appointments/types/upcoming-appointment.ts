export type UpcomingAppointmentCardProps = {
  showHeader?: boolean;
  doctorName: string;
  specialization?: string;
  date: string;
  time: string;
  onCardPress?: () => void;
  onReschedulePress?: () => void;
  onViewProfilePress?: () => void;
};
