import { create } from "zustand";
import {
  appointments,
  createConsultation,
  initialSchedule,
} from "../data/demo";
import type { Consultation, Message, Schedule } from "../types/doctor";

type DoctorState = {
  available: boolean;
  consultations: Record<string, Consultation>;
  messages: Record<string, Message[]>;
  schedule: Schedule;
  completedIds: string[];
  notifications: boolean;
  setAvailable: (available: boolean) => void;
  updateConsultation: (
    id: string,
    patientId: string,
    changes: Partial<Consultation>
  ) => void;
  complete: (id: string, patientId: string) => void;
  sendMessage: (id: string, text: string) => void;
  saveSchedule: (schedule: Schedule) => void;
  setNotifications: (value: boolean) => void;
  reset: () => void;
};
const initial = () => ({
  available: true,
  consultations: Object.fromEntries(
    appointments.map((a) => [
      a.id,
      {
        ...createConsultation(a.patientId),
        completed: a.status === "completed",
      },
    ])
  ),
  messages: {},
  schedule: { ...initialSchedule },
  completedIds: appointments
    .filter((a) => a.status === "completed")
    .map((a) => a.id),
  notifications: true,
});
export const useDoctorStore = create<DoctorState>((set) => ({
  ...initial(),
  setAvailable: (available) => set({ available }),
  updateConsultation: (id, patientId, changes) =>
    set((state) => ({
      consultations: {
        ...state.consultations,
        [id]: {
          ...(state.consultations[id] ?? createConsultation(patientId)),
          ...changes,
        },
      },
    })),
  complete: (id, patientId) =>
    set((state) => ({
      completedIds: [...new Set([...state.completedIds, id])],
      consultations: {
        ...state.consultations,
        [id]: {
          ...(state.consultations[id] ?? createConsultation(patientId)),
          completed: true,
        },
      },
    })),
  sendMessage: (id, text) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [id]: [
          ...(state.messages[id] ?? []),
          {
            id: `${Date.now()}-${Math.random()}`,
            text,
            sent: true,
            time: new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ],
      },
    })),
  saveSchedule: (schedule) => set({ schedule }),
  setNotifications: (notifications) => set({ notifications }),
  reset: () => set(initial()),
}));
