export function clampCallPreview(
  x: number,
  y: number,
  width: number,
  height: number,
  previewWidth: number,
  previewHeight: number
) {
  return {
    x: Math.max(8, Math.min(x, Math.max(8, width - previewWidth - 8))),
    y: Math.max(8, Math.min(y, Math.max(8, height - previewHeight - 8))),
  };
}
