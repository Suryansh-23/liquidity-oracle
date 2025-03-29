import { K } from "../constants";
import { Vector } from "../types";

const EDGE_WEIGHT = 0.1;
const SCALE_FACTOR = 10000n; // Using 10000 as scale factor for 4 decimal places of precision

/**
 * Exponential decay function adapted for bigint calculations
 * Returns a scaled integer representation of the decay value
 */
const expoDecay = (x: bigint, k: number): bigint => {
  // Calculate decay rate from the edge weight and distribution size
  const lambda = -Math.log(EDGE_WEIGHT) / k;

  // Calculate a threshold beyond which the result would be effectively zero
  const thresholdX = BigInt(Math.ceil(Math.log(Number(SCALE_FACTOR)) / lambda));

  // Early return for extremely large distances where decay is effectively zero
  if (x > thresholdX) {
    return 0n;
  }

  // For large bigints that exceed safe number range
  if (x > BigInt(Number.MAX_SAFE_INTEGER)) {
    // Split the calculation using the mathematical property:
    // e^(-λx) = e^(-λ(q*MAX_SAFE_INTEGER + r)) = (e^(-λ*MAX_SAFE_INTEGER))^q * e^(-λr)
    const base = BigInt(Number.MAX_SAFE_INTEGER);
    const quotient = x / base;
    const remainder = x % base;

    // Calculate the base decay for one chunk
    const baseDecay = Math.exp(-lambda * Number(base));

    // If quotient is very large, the result will be effectively zero
    if (quotient > BigInt(100)) {
      return 0n;
    }

    // Calculate the final decay value
    const quotientDecay = Math.pow(baseDecay, Number(quotient));
    const remainderDecay = Math.exp(-lambda * Number(remainder));
    const totalDecay = quotientDecay * remainderDecay;

    // Scale and return as bigint
    return BigInt(Math.round(totalDecay * Number(SCALE_FACTOR)));
  }

  // For values within safe number range
  const floatResult = Math.exp(-lambda * Number(x));
  return BigInt(Math.round(floatResult * Number(SCALE_FACTOR)));
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

  // Convert bigints to numbers for this calculation
  const size = Math.trunc((2 * K) / tickSpacing);

  // Calculate weighted sum with exponential decay based on distance
  return distWithDistance.reduce((sum, point) => {
    // Multiply the decay factor by the liquidity and add to sum
    return sum + (expoDecay(point[0], size) * point[1]) / SCALE_FACTOR;
  }, 0n);
};

export default depth;
