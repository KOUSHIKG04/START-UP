import type { DoctorRecord } from "../types/doctorManagement";

// Demo data only; these values are not loaded from a backend.
export const initialDoctors: DoctorRecord[] = [
  {
    id: "1",
    name: "Dr. Priya Sharma",
    specialization: "Cardiology",
    clinzoId: "CLZ-DOC-2024-001",
    phone: "+91 98450 12345",
    status: "Active",
    avatar:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120",
  },
  {
    id: "2",
    name: "Dr. Rajesh Kumar",
    specialization: "Neurology",
    clinzoId: "CLZ-DOC-2024-002",
    phone: "+91 98450 23456",
    status: "Active",
    avatar:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120",
  },
  {
    id: "3",
    name: "Dr. Suresh Babu",
    specialization: "General Medicine",
    clinzoId: "CLZ-DOC-2024-003",
    phone: "+91 98450 34567",
    status: "On Call",
    avatar:
      "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=120",
  },
  {
    id: "4",
    name: "Dr. Arjun Mehta",
    specialization: "Pediatrics",
    clinzoId: "CLZ-DOC-2024-004",
    phone: "+91 98450 45678",
    status: "Active",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
  },
  {
    id: "5",
    name: "Dr. Karthik Raman",
    specialization: "Orthopedics",
    clinzoId: "CLZ-DOC-2024-005",
    phone: "+91 98450 56789",
    status: "On Leave",
    avatar:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120",
  },
];
export const doctorManagementSummary = {
  total: 84,
  active: 36,
  verified: 82,
} as const;
