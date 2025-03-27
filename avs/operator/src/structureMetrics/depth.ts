import { Vector } from "../types";
import { MAX_TICK, MIN_TICK } from "../utils";

const EDGE_WEIGHT = 0.1;
const SCALE_FACTOR = 10000n; // Using 10000 as scale factor for 4 decimal places of precision

/**
 * Exponential decay function adapted for bigint calculations
 * Returns a scaled integer representation of the decay value
 */
const expoDecay = (x: bigint, k: number): bigint => {
  // For bigint calculations, we need to use a lookup table or approximation
  // We'll use a scaled integer approach with the scale factor

  // The original function: Math.exp(-lambda * x) where lambda = -Math.log(EDGE_WEIGHT) / k
  // Convert to floating point for the calculation
  const lambda = -Math.log(EDGE_WEIGHT) / k;
  const floatResult = Math.exp(-lambda * Number(x));

  // Convert back to scaled bigint
  return BigInt(Math.floor(floatResult * Number(SCALE_FACTOR)));
};

/**
 * Calculate the liquidity depth metric
 * @param dist Distribution vector
 * @param currentTick Current price tick
 * @param tickSpacing Spacing between ticks
 * @returns Scaled bigint representation of the depth score
 */
const depth = (
  dist: Vector<number>,
  currentTick: number,
  tickSpacing: number
): bigint => {
  // Calculate distances from current tick
  const distWithDistance = dist.map((point) => [
    BigInt(Math.abs(Number(point[0]) - currentTick)),
    point[1],
  ]);

  const size = Math.trunc((MAX_TICK - MIN_TICK) / tickSpacing);

  // Calculate weighted sum with exponential decay based on distance
  return distWithDistance.reduce((sum, point) => {
    // Multiply the decay factor by the liquidity and add to sum
    return sum + (expoDecay(point[0], size) * point[1]) / SCALE_FACTOR;
  }, 0n);
};

export default depth;
