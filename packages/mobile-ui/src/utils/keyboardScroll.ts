export function keyboardScrollAdjustment({
  inputTop,
  inputHeight,
  viewportTop,
  viewportHeight,
  keyboardTop,
  gap = 24,
}: {
  inputTop: number;
  inputHeight: number;
  viewportTop: number;
  viewportHeight: number;
  keyboardTop: number;
  gap?: number;
}) {
  const visibleBottom = Math.min(viewportTop + viewportHeight, keyboardTop);
  const overlap = inputTop + inputHeight + gap - visibleBottom;
  return overlap > 0 ? overlap : Math.min(0, inputTop - viewportTop - gap);
}
