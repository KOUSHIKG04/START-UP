import { rowColors } from "./bedManagementConstants";

export function bedRowColor(index: number): string {
  return rowColors[index % rowColors.length];
}
