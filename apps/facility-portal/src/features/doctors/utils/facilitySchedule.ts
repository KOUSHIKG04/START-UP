import type { ClinicSession, FacilityDoctorRosterItem } from "@startup/contracts";
import type { DeptSchedule } from "../types/doctorSchedules";

export type PracticeSession = { practiceId: string; session: ClinicSession };

const dayKey = (date: Date, timeZone = "Asia/Kolkata") =>
  new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

const clock = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);

const hour = (date: Date, timeZone: string) =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(date));

export function facilitySchedule(doctors: FacilityDoctorRosterItem[], sessions: PracticeSession[], now = new Date()) {
  const byPractice = new Map(doctors.map(doctor => [doctor.practice_id, doctor]));
  const active = sessions.filter(({ practiceId, session }) => byPractice.has(practiceId) &&
    session.service_mode !== "home" && session.state !== "cancelled" && session.state !== "closed");
  const today = active.filter(({ session }) => dayKey(new Date(session.starts_at), session.timezone) === dayKey(now, session.timezone));
  const future = today.filter(({ session }) => new Date(session.ends_at) > now);
  const groups = new Map<string, DeptSchedule>();
  for (const { practiceId, session } of today) {
    const doctor = byPractice.get(practiceId)!;
    const department = doctor.specialization || "Not specified";
    const group = groups.get(department) ?? { department, shifts: [] };
    const start = new Date(session.starts_at);
    const end = new Date(session.ends_at);
    const startCol = Math.min(6, Math.floor(hour(start, session.timezone) / 4) + 1);
    const endCol = Math.min(7, Math.ceil((hour(end, session.timezone) + 1) / 4) + 1);
    group.shifts.push({ doctor: doctor.name, time: `${clock(start, session.timezone)}-${clock(end, session.timezone)}`,
      type: session.service_mode === "online" ? "on-call" : "on-duty", startCol,
      spanCols: Math.max(1, Math.min(7 - startCol, endCol - startCol)) });
    groups.set(department, group);
  }
  const assignments = future.map(({ practiceId, session }) => {
    const doctor = byPractice.get(practiceId)!;
    return { id: session.id, practiceId, name: doctor.name, department: doctor.specialization || "Not specified",
      shiftTime: `${clock(new Date(session.starts_at), session.timezone)} – ${clock(new Date(session.ends_at), session.timezone)}`,
      status: session.service_mode === "online" ? "On Call" as const : "On Duty" as const,
      contact: doctor.phone };
  });
  const summary = {
    total: doctors.length,
    available: doctors.filter(doctor => doctor.present && !doctor.on_leave && active.some(({ practiceId, session }) =>
      practiceId === doctor.practice_id && session.service_mode === "clinic" &&
      new Date(session.starts_at) <= now && new Date(session.ends_at) > now)).length,
    surgery: null,
    emergency: null,
  };
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7) + index);
    return dayKey(date);
  });
  const weekly = doctors.map(doctor => ({ id: doctor.id, name: doctor.name,
    speciality: doctor.specialization,
    days: weekDays.map(day => active.some(({ practiceId, session }) =>
      practiceId === doctor.practice_id && session.service_mode === "clinic" &&
      dayKey(new Date(session.starts_at), session.timezone) === day)),
  }));
  return { departments: [...groups.values()], assignments, summary, weekly };
}
