export const scheduleTabs = ["Today", "Tomorrow", "This Week", "Custom"] as const;
export const scheduleTimeLabels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"] as const;
export const shiftStyles = {
  "on-duty": "bg-[#e6f4f5] text-[#07595d] border-l-4 border-[#07595d]",
  surgery: "bg-[#fee2e2] text-[#b91c1c] border-l-4 border-[#ef4444]",
  "on-call": "bg-[#fef3c7] text-[#92400e] border-l-4 border-[#f59e0b]",
} as const;
