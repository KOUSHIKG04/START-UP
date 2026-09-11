/**
 * Generates a continuous SVG path for the capsule tab bar with a smooth scooped notch
 * cradling the circular SOS button (center at cx = width / 2, y = 14; button radius = 32, notch radius = 36).
 *
 * @param width - Dynamically measured container width
 * @param height - Bar height (default: 72)
 */
export function getNotchedBarPath(width: number, height: number): string {
  const r = 32; // Corner radius of capsule bar
  const cx = width / 2;
  const notchRadius = 41;
  const notchDepth = 49; // Reaches below button bottom (y=46) for concentric cradle
  const shoulder = 18;

  const leftShoulderStart = cx - notchRadius - shoulder; // cx - 50
  const leftNotchTop = cx - notchRadius + 2;             // cx - 34
  const rightNotchTop = cx + notchRadius - 2;            // cx + 34
  const rightShoulderEnd = cx + notchRadius + shoulder;  // cx + 50

  return [
    `M ${r} 0`,
    `L ${leftShoulderStart} 0`,
    // Smooth left shoulder curving into the notch
    `C ${leftShoulderStart + 8} 0, ${cx - notchRadius} 6, ${leftNotchTop} 16`,
    // Concentric bottom circular cradle hugging the button
    `C ${cx - 28} 42, ${cx - 16} ${notchDepth}, ${cx} ${notchDepth}`,
    `C ${cx + 16} ${notchDepth}, ${cx + 28} 42, ${rightNotchTop} 16`,
    // Smooth right shoulder curving back to the top flat line
    `C ${cx + notchRadius} 6, ${rightShoulderEnd - 8} 0, ${rightShoulderEnd} 0`,
    `L ${width - r} 0`,
    `A ${r} ${r} 0 0 1 ${width} ${r}`,
    `L ${width} ${height - r}`,
    `A ${r} ${r} 0 0 1 ${width - r} ${height}`,
    `L ${r} ${height}`,
    `A ${r} ${r} 0 0 1 0 ${height - r}`,
    `L 0 ${r}`,
    `A ${r} ${r} 0 0 1 ${r} 0`,
    `Z`,
  ].join(" ");
}
