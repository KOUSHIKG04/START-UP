const INNER_RING_INSET = 8;

export function getSOSButtonDimensions(size: number) {
  const innerRingSize = size - INNER_RING_INSET;

  return {
    radius: size / 2,
    innerRingSize,
    innerRingRadius: innerRingSize / 2,
  };
}
