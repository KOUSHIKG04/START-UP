export type Mode = "clinic" | "online" | "home";

export type FacilityDoctorScheduleScreenProps = {
  practiceId: string;
  mode?: Mode;
};
