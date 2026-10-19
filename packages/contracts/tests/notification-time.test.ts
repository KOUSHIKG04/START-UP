import { expect, test } from "bun:test";
import { notificationTime } from "../src/utils/notificationTime";
import { formatDisplayDate } from "../src/dates";

const now = Date.parse("2026-10-17T12:00:00Z");
const ago = (milliseconds: number) =>
  new Date(now - milliseconds).toISOString();

test("relative notification labels retain all existing time boundaries", () => {
  const cases: [number, string][] = [
    [0, "Just now"],
    [59_999, "Just now"],
    [60_000, "1m ago"],
    [3_599_999, "59m ago"],
    [3_600_000, "1h ago"],
    [86_399_999, "23h ago"],
    [86_400_000, "Yesterday"],
    [172_799_999, "Yesterday"],
    [172_800_000, "2d ago"],
    [604_799_999, "6d ago"],
  ];
  for (const [elapsed, expected] of cases)
    expect(notificationTime(ago(elapsed), now)).toBe(expected);
});

test("older, future and invalid timestamps retain display-date fallback", () => {
  for (const value of [ago(604_800_000), ago(-60_000), "invalid"]) {
    expect(notificationTime(value, now)).toBe(formatDisplayDate(value));
  }
});
