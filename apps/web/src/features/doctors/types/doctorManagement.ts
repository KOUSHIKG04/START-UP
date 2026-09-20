export interface DoctorRecord {
  id: string;
  name: string;
  specialization: string;
  clinzoId: string;
  phone: string;
  status: "Active" | "On Call" | "On Leave";
  avatar: string;
}
