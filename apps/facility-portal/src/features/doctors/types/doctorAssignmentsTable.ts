export type Assignment = {
  id: string;
  practiceId: string;
  name: string;
  department: string;
  shiftTime: string;
  status: "On Duty" | "On Call" | "Home Visit" | "In Surgery";
  contact: string;
};

export type DoctorAssignmentsTableProps = {
  assignments: Assignment[];
  selectedDay: string;
};
