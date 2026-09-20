import { create } from "zustand";

export type Profile = {
  name: string;
  mobile: string;
  dob: string;
  city: string;
  photo?: string;
};
export type TripStage =
  "idle" | "request" | "pickup" | "arrived" | "progress" | "complete";
export type Trip = {
  id: string;
  patient: string;
  pickup: string;
  hospital: string;
  fare: number;
  distance: string;
  duration: string;
  completedAt: number;
};
export const emergency = {
  id: "CLZ-1042",
  patient: "Rajesh Kumar",
  pickup: "Sriramapura, Shivamogga, Karnataka",
  hospital: "Manipal Hospital, Shivamogga",
  fare: 1200,
  distance: "8.2 km",
  duration: "14 mins",
};
export type Message = {
  id: string;
  text: string;
  incoming: boolean;
  time: string;
};
const initialMessages: Message[] = [
  {
    id: "1",
    incoming: true,
    text: "Are you close? The patient is having severe breathing difficulty and we are ready at the door.",
    time: "9:42 AM",
  },
  {
    id: "2",
    incoming: false,
    text: "Yes, I am on my way. Passing through Sriramapura main road now. The traffic is a bit heavy but we are moving fast.",
    time: "9:43 AM",
  },
  {
    id: "3",
    incoming: false,
    text: "Estimated arrival is in 7 minutes. Please keep the main gate clear.",
    time: "9:43 AM",
  },
  {
    id: "4",
    incoming: true,
    text: "Understood. The gate is open and the stretcher path is clear. Thank you.",
    time: "9:44 AM",
  },
];
type DriverState = {
  profile: Profile;
  submitted: boolean;
  verified: boolean;
  online: boolean;
  stage: TripStage;
  trips: Trip[];
  messages: Message[];
  deadline: number | null;
  saveProfile: (profile: Profile) => void;
  submit: () => void;
  previewVerified: () => void;
  setOnline: (online: boolean) => void;
  request: () => void;
  accept: () => void;
  reject: () => void;
  arrive: () => void;
  startTrip: (pin: string) => boolean;
  complete: () => void;
  finish: () => void;
  send: (text: string) => void;
};
// Local preview adapter. Replace these actions with authenticated dispatch APIs.
// Verification is deliberately explicit; submitting documents never approves a driver.
export const useDriver = create<DriverState>((set, get) => ({
  profile: { name: "", mobile: "", dob: "", city: "" },
  submitted: false,
  verified: false,
  online: false,
  stage: "idle",
  trips: [],
  messages: initialMessages,
  deadline: null,
  saveProfile: (profile) => set({ profile }),
  submit: () => set({ submitted: true, verified: false }),
  previewVerified: () => set({ verified: true }),
  setOnline: (online) => {
    if (get().verified && ["idle", "complete"].includes(get().stage))
      set({ online });
  },
  request: () => {
    if (get().online && get().stage === "idle")
      set({
        stage: "request",
        deadline: Date.now() + 15000,
        messages: initialMessages,
      });
  },
  accept: () => {
    if (get().stage === "request" && (get().deadline ?? 0) > Date.now())
      set({ stage: "pickup", deadline: null });
    else get().reject();
  },
  reject: () => {
    if (get().stage === "request") set({ stage: "idle", deadline: null });
  },
  arrive: () => {
    if (get().stage === "pickup") set({ stage: "arrived" });
  },
  startTrip: (pin) => {
    if (get().stage !== "arrived" || pin !== "1234") return false;
    set({ stage: "progress" });
    return true;
  },
  complete: () => {
    if (get().stage === "progress")
      set({
        stage: "complete",
        trips: [
          ...get().trips,
          { ...emergency, id: `${Date.now()}`, completedAt: Date.now() },
        ],
      });
  },
  finish: () => {
    if (get().stage === "complete") set({ stage: "idle" });
  },
  send: (text) => {
    if (text.trim() && ["pickup", "arrived", "progress"].includes(get().stage))
      set({
        messages: [
          ...get().messages,
          {
            id: `${Date.now()}-${get().messages.length}`,
            text: text.trim(),
            incoming: false,
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ],
      });
  },
}));
