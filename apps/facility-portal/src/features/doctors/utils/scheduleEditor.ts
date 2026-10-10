/** Convert a wall-clock time using the practice timezone, never the browser timezone. */
export function practiceSlotIso(
  day: string,
  clock: string,
  timeZone: string
): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock)
  )
    throw new Error("Choose a valid date and time.");
  const desired = Date.parse(`${day}T${clock}:00Z`);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const wall = (timestamp: number) => {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(timestamp))
        .map((part) => [part.type, part.value])
    );
    return Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`
    );
  };
  let actual = desired;
  for (let i = 0; i < 3; i++) actual += desired - wall(actual);
  if (wall(actual) !== desired)
    throw new Error("This local time does not exist in the practice timezone.");
  return new Date(actual).toISOString();
}
export function previewClocks(
  start: string,
  end: string,
  duration: number
): string[] {
  const parse = (value: string, allowEnd = false) =>
    allowEnd && value === "24:00"
      ? 1440
      : /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
        ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3))
        : NaN;
  const first = parse(start),
    last = parse(end, true);
  if (
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 120 ||
    !Number.isFinite(first) ||
    !Number.isFinite(last) ||
    last <= first
  )
    return [];
  const result: string[] = [];
  for (let minute = first; minute + duration <= last; minute += duration)
    result.push(
      `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`
    );
  return result;
}
