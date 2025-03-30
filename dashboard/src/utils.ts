/**
 * Sanitizes a tick range to ensure it's aligned with the tick spacing
 * @param tickLower The lower tick value
 * @param tickUpper The upper tick value
 * @param tickSpacing The tick spacing value
 * @returns A tuple of [sanitizedLowerTick, sanitizedUpperTick]
 */
export function sanitizeTickRange(
  tickLower: number,
  tickUpper: number,
  tickSpacing: number
): [number, number] {
  // Round to the nearest valid tick based on spacing
  const sanitizedLower = Math.floor(tickLower / tickSpacing) * tickSpacing;
  const sanitizedUpper = Math.ceil(tickUpper / tickSpacing) * tickSpacing;

  return [sanitizedLower, sanitizedUpper];
}
