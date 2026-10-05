import { formatDisplayDate } from "@startup/contracts";

export const bedManagementDateFormatter = { format: (date: Date) => formatDisplayDate(date, "Asia/Kolkata") };
