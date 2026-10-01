import type { DeptSchedule } from "../types/doctorSchedules";

// Demo data only; these values are not loaded from a backend.
export const deptSchedules: DeptSchedule[] = [
  {
    department: "Cardiology",
    shifts: [
      {
        doctor: "Dr. Patel",
        time: "08:00-16:00",
        type: "on-duty",
        startCol: 3,
        spanCols: 2,
      },
      {
        doctor: "Dr. Sarah J.",
        time: "16:00-24:00",
        type: "on-duty",
        startCol: 5,
        spanCols: 2,
      },
    ],
  },
  {
    department: "Pediatrics",
    shifts: [
      {
        doctor: "Dr. Miller",
        time: "08:00-16:00",
        type: "on-duty",
        startCol: 3,
        spanCols: 2,
      },
    ],
  },
  {
    department: "Orthopedics",
    shifts: [
      {
        doctor: "Dr. Al-Sabah",
        time: "08:00-16:00",
        type: "surgery",
        startCol: 3,
        spanCols: 2,
      },
    ],
  },
  {
    department: "Emergency",
    shifts: [
      {
        doctor: "Dr. Kim",
        time: "08:00-16:00",
        type: "on-call",
        startCol: 3,
        spanCols: 2,
      },
      {
        doctor: "Dr. Jenkins",
        time: "12:00-20:00",
        type: "surgery",
        startCol: 4,
        spanCols: 2,
      },
    ],
  },
  {
    department: "Oncology",
    shifts: [
      {
        doctor: "Dr. Chen",
        time: "08:00-16:00",
        type: "on-duty",
        startCol: 3,
        spanCols: 2,
      },
    ],
  },
  {
    department: "Neurology",
    shifts: [
      {
        doctor: "Dr. Gomez",
        time: "16:00-24:00",
        type: "on-call",
        startCol: 5,
        spanCols: 2,
      },
    ],
  },
  {
    department: "ICU",
    shifts: [
      {
        doctor: "Dr. Foster",
        time: "20:00-24:00",
        type: "on-call",
        startCol: 6,
        spanCols: 1,
      },
    ],
  },
];

export const todayAssignments = [
  {
    name: "Dr. Sarah Jenkins",
    department: "Cardiology",
    shiftTime: "Day Shift (08:00 – 16:00)",
    status: "In Surgery",
    contact: "+1 (555) 019-2834",
    avatar:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120",
  },
  {
    name: "Dr. Alistair Miller",
    department: "Pediatrics",
    shiftTime: "Day Shift (08:00 – 16:00)",
    status: "On Duty",
    contact: "+1 (555) 014-9831",
    avatar:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120",
  },
  {
    name: "Dr. Elena Rostova",
    department: "Neurology",
    shiftTime: "Evening Shift (16:00 – 24:00)",
    status: "On Call",
    contact: "+1 (555) 017-4821",
    avatar:
      "https://images.unsplash.com/photo-1594824813689-53e778643ba9?auto=format&fit=crop&q=80&w=120",
  },
  {
    name: "Dr. David Vance",
    department: "Emergency",
    shiftTime: "Night Shift (20:00 – 08:00)",
    status: "On Duty",
    contact: "+1 (555) 012-3294",
    avatar:
      "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=120",
  },
];
export const scheduleTabs = [
  "Today",
  "Tomorrow",
  "This Week",
  "Custom",
] as const;
export const scheduleDateLabel = "Nov 15, 2024";

export const scheduleSummary = {
  total: 84,
  available: 36,
  surgery: 8,
  emergency: 12,
} as const;
export const scheduleTimeLabels = [
  "00:00",
  "04:00",
  "08:00",
  "12:00",
  "16:00",
  "20:00",
] as const;
export const shiftStyles = {
  "on-duty": "bg-[#e6f4f5] text-[#07595d] border-l-4 border-[#07595d]",
  surgery: "bg-[#fee2e2] text-[#b91c1c] border-l-4 border-[#ef4444]",
  "on-call": "bg-[#fef3c7] text-[#92400e] border-l-4 border-[#f59e0b]",
} as const;
