import type { Schedule } from "../../../types/doctor";
export function initialSchedule(mode: "clinic" | "online" | "home"): Schedule {
  return {
    days: [],
    start: mode === "online" ? "13:00" : mode === "home" ? "16:00" : "09:00",
    end: mode === "online" ? "15:00" : "17:00",
    duration: 15,
    onlineDuration: 15,
    homeDuration: 60,
    online: 8,
    walkIn: 12,
    clinicApp: 12,
    clinicWalkin: 0,
    autoAccept: false,
    autoLimit: 1,
    homeVisits: false,
    homeRadius: "",
    onlineFee: "0",
    clinicFee: "0",
    homeFee: "0",
  };
}
