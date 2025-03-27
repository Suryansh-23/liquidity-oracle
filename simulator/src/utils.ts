export const sanitizeTick = (tick: number): number => {
  return Math.max(Math.min(tick, 887272), -887272);
};

export const sanitizeLowerTick = (
  lowerTick: number,
  tickSpacing: number
): number => {
  return Math.ceil(lowerTick / tickSpacing) * tickSpacing;
};

export const sanitizeUpperTick = (
  upperTick: number,
  tickSpacing: number
): number => {
  return Math.floor(upperTick / tickSpacing) * tickSpacing;
};

export const sanitizeTickRange = (
  lowerTick: number,
  upperTick: number,
  tickSpacing: number
): [number, number] => {
  const validLowerTickValue = sanitizeLowerTick(lowerTick, tickSpacing);
  const validUpperTickValue = sanitizeUpperTick(upperTick, tickSpacing);

  if (validLowerTickValue >= validUpperTickValue) {
    throw new Error("Invalid tick range");
  }

  return [sanitizeTick(validLowerTickValue), sanitizeTick(validUpperTickValue)];
};
