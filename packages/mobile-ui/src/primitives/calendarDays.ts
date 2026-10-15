export function parseCalendarDay(day: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [year, month, date] = day.split("-").map(Number);
  const result = new Date(year, month - 1, date, 12);
  return result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === date ? result : null;
}

export function formatCalendarDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function calendarMonthDays(month: Date): Array<string | null> {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12).getDate();
  const cells: Array<string | null> = Array(first.getDay()).fill(null);
  for (let day = 1; day <= count; day++) cells.push(formatCalendarDay(new Date(first.getFullYear(), first.getMonth(), day, 12)));
  while (cells.length % 7) cells.push(null);
  return cells;
}
