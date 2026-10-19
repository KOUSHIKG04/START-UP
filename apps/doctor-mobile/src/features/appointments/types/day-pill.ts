import type { DayItem } from "./appointments-screen";

export type DayPillProps = {
  day: DayItem;
  selected: boolean;
  onPress: (key: string) => void;
};
