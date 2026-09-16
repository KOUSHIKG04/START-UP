export type AppointmentStatus = "pending" | "approved";

export type ConsultationType = "Clinic Visit" | "Home Visit" | "Online";

export type VisitSessionMode =
  "clinic-check-in" | "home-tracking" | "online-video" | "online-chat";

export type Appointment = {
  id: string;
  doctorName: string;
  qualification: string;
  specialty: string;
  consultationType: ConsultationType;
  date: string;
  time: string;
  hospital: string;
  location: string;
  experience: string;
  rating: string;
  fee: string;
  status: AppointmentStatus;
};
