const rowColors = [
  "bg-[#22c55e]",
  "bg-[#3b82f6]",
  "bg-[#8b5cf6]",
  "bg-[#ef4444]",
  "bg-[#f59e0b]",
  "bg-[#06b6d4]",
  "bg-[#8b5cf6]",
  "bg-[#8b5cf6]",
] as const;

export function bedRowColor(index: number): string {
  return rowColors[index % rowColors.length];
}
