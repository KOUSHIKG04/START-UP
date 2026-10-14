/** Convert the doctor's wall clock, including an exclusive 24:00 end, to UTC. */
export function practiceTimeIso(
  day: string,
  clock: string,
  timeZone: string
): string {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(clock) && clock !== "24:00")
  )
    throw new Error("Enter a valid date and time.");
  const desired =
    Date.parse(`${day}T${clock === "24:00" ? "00:00" : clock}:00Z`) +
    (clock === "24:00" ? 86400000 : 0);
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
    throw new Error("This time does not exist in the doctor's timezone.");
  return new Date(actual).toISOString();
}
