export type AppointmentStatus = "pending" | "approved";

export type Appointment = {
  id: string;
  doctorName: string;
  qualification: string;
  specialty: string;
  consultationType: "Clinic Visit" | "Home Visit" | "Online";
  date: string;
  time: string;
  hospital: string;
  location: string;
  experience: string;
  rating: string;
  fee: string;
  status: AppointmentStatus;
};
