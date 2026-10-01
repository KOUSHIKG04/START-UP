export interface ShiftBlock {
  doctor: string;
  time: string;
  type: "on-duty" | "surgery" | "on-call";
  startCol: number; // 1 to 6 (representing 4h chunks: 00-04, 04-08, 08-12, 12-16, 16-20, 20-24)
  spanCols: number;
}

export interface DeptSchedule {
  department: string;
  shifts: ShiftBlock[];
}
