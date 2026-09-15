export type VisitMode = "clinic" | "online" | "home";
export type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string;
  blood: string;
  bp: string;
  pulse: string;
  temperature: string;
  address: string;
  pin: string;
};
export type Appointment = {
  id: string;
  patientId: string;
  mode: VisitMode;
  date: string;
  time: string;
  queue: string;
  status: "waiting" | "completed";
};
export type Medicine = {
  id: string;
  name: string;
  timing: "Before food" | "After food";
  meals: [number, number, number];
  days: string;
};
export type Consultation = {
  notes: string;
  medicines: Medicine[];
  followUp: string;
  signed: boolean;
  completed: boolean;
};
export type Message = { id: string; text: string; sent: boolean; time: string };
export type Schedule = {
  days: number[];
  start: string;
  end: string;
  duration: number;
  online: number;
  walkIn: number;
  autoAccept: boolean;
  autoLimit: number;
  homeVisits: boolean;
  onlineFee: string;
  clinicFee: string;
  homeFee: string;
};
