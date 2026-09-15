import type {
  Appointment,
  Consultation,
  Patient,
  Schedule,
} from "../types/doctor";

// Fixtures reproduce the supplied designs. Never use these values as clinical guidance.
export const demoDate = "2026-08-05";
export const patients: Patient[] = [
  {
    id: "CLZ-0001",
    name: "Meera Sharma",
    age: 28,
    gender: "Female",
    blood: "O+",
    bp: "120 / 80",
    pulse: "88 bpm",
    temperature: "101.4 F",
    address:
      "2nd Main, Jayanagar, Bengaluru. Landmark: Near South End Circle, Bengaluru, Karnataka 560060",
    pin: "1234",
  },
  {
    id: "CLZ-0002",
    name: "Akashadeepa",
    age: 28,
    gender: "Female",
    blood: "B+",
    bp: "118 / 78",
    pulse: "76 bpm",
    temperature: "98.6 F",
    address: "Jayanagar, Bengaluru, Karnataka",
    pin: "2345",
  },
  {
    id: "CLZ-0003",
    name: "Akash Gowda",
    age: 22,
    gender: "Male",
    blood: "A+",
    bp: "122 / 80",
    pulse: "80 bpm",
    temperature: "98.4 F",
    address: "Bengaluru, Karnataka",
    pin: "3456",
  },
];
export const appointments: Appointment[] = [
  {
    id: "clinic-meera",
    patientId: "CLZ-0001",
    mode: "clinic",
    date: demoDate,
    time: "8:30 PM – 9:00 PM",
    queue: "03",
    status: "waiting",
  },
  {
    id: "online-akasha",
    patientId: "CLZ-0002",
    mode: "online",
    date: demoDate,
    time: "9:00 PM – 9:30 PM",
    queue: "04",
    status: "waiting",
  },
  {
    id: "home-meera",
    patientId: "CLZ-0001",
    mode: "home",
    date: "2026-08-06",
    time: "5:30 PM",
    queue: "05",
    status: "waiting",
  },
  {
    id: "online-akash",
    patientId: "CLZ-0003",
    mode: "online",
    date: demoDate,
    time: "09:55 AM",
    queue: "02",
    status: "completed",
  },
];
export function createConsultation(patientId: string): Consultation {
  return {
    notes:
      patientId === "CLZ-0001"
        ? "Patient reports high fever starting last night. Prescribing Paracetamol and advising complete rest for 2 days. Monitor temperature..."
        : "",
    medicines:
      patientId === "CLZ-0001"
        ? [
            {
              id: "medicine-1",
              name: "Paracetamol 500 mg",
              timing: "After food",
              meals: [0, 1, 1],
              days: "5",
            },
            {
              id: "medicine-2",
              name: "Amoxyln",
              timing: "After food",
              meals: [0, 0, 1],
              days: "5",
            },
          ]
        : [],
    followUp: "2026-08-27",
    signed: false,
    completed: false,
  };
}
export const initialSchedule: Schedule = {
  days: [0, 1, 2, 3],
  start: "09:00",
  end: "17:00",
  duration: 30,
  online: 8,
  walkIn: 5,
  autoAccept: true,
  autoLimit: 10,
  homeVisits: false,
  onlineFee: "500",
  clinicFee: "700",
  homeFee: "1500",
};
export const modeLabels = {
  clinic: "Clinic",
  online: "Online",
  home: "Home Visit",
};
