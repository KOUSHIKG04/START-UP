export const scheduleTabs = [
  "Today",
  "Tomorrow",
  "This Week",
  "Custom",
] as const;
export const scheduleTimeLabels = [
  "00:00",
  "04:00",
  "08:00",
  "12:00",
  "16:00",
  "20:00",
] as const;
export const shiftStyles = {
  "on-duty": "bg-muted text-primary border-l-4 border-primary",
  surgery: "bg-destructive/10 text-destructive border-l-4 border-destructive",
  "on-call": "bg-muted text-muted-foreground border-l-4 border-border",
  "home-visit": "bg-muted text-primary border-l-4 border-primary",
} as const;
