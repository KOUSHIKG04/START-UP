/** Window coordinates must share the same origin; use the actual form viewport. */
export function keyboardScrollAdjustment({
  inputTop, inputHeight, viewportTop, viewportHeight, keyboardTop, gap = 24,
}: {
  inputTop: number;
  inputHeight: number;
  viewportTop: number;
  viewportHeight: number;
  keyboardTop: number;
  gap?: number;
}) {
  const visibleBottom = Math.min(viewportTop + viewportHeight, keyboardTop);
  const bottomOverlap = inputTop + inputHeight + gap - visibleBottom;
  if (bottomOverlap > 0) return bottomOverlap;
  return Math.min(0, inputTop - viewportTop - gap);
}
