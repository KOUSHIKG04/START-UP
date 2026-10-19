export function splitBottomNavItems<T>(items: readonly T[]) {
  const midpoint = Math.ceil(items.length / 2);

  return {
    leftItems: items.slice(0, midpoint),
    rightItems: items.slice(midpoint),
  };
}
