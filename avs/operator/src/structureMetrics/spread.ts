import { Vector } from "../types";
import { sumNormalize } from "../utils";

/**
 * Calculates the Liquidity Spread of the Liquidity Distribution
 * @param dist Vector representing liquidity distribution
 * @param currentTick Current tick position
 * @returns Standard deviation of the distribution as a scaled bigint
 */
const spread = (dist: Vector<number>, currentTick: number): bigint => {
  // Scale factor for decimal precision (10^4 for 4 decimal places)
  const SCALE_FACTOR = 10000n;
  const SQRT_SCALE_FACTOR = 100n; // Square root of SCALE_FACTOR

  // Calculate normalized weights with distances
  const weightsAndDistance = sumNormalize(dist).map((point) => [
    BigInt(Math.abs(Number(point[0]) - currentTick)),
    point[1],
  ]);

  // Calculate weighted mean (mu)
  const mu = weightsAndDistance.reduce(
    (sum, point) => sum + (point[0] * point[1]) / SCALE_FACTOR,
    0n
  );

  // Calculate variance (sum of squared differences from mean, weighted by distribution)
  const variance = weightsAndDistance.reduce((sum, point) => {
    const diff = point[0] > mu ? point[0] - mu : mu - point[0];
    return sum + (diff * diff * point[1]) / SCALE_FACTOR;
  }, 0n);

  // For bigint square root, we'll use a simple approximation
  // For more precision in production, use a proper bigint square root algorithm
  return bigintSqrt(variance * SCALE_FACTOR);
};

/**
 * Simple bigint square root approximation
 * Uses binary search to find the square root
 */
function bigintSqrt(value: bigint): bigint {
  if (value < 0n) {
    throw new Error("Square root of negative number is not supported");
  }

  if (value < 2n) {
    return value;
  }

  // Initial guess for binary search
  let lo = 0n;
  let hi = value;

  // Continue until we converge on the answer
  while (lo <= hi) {
    const mid = (lo + hi) / 2n;
    const midSquared = mid * mid;

    if (midSquared === value) {
      return mid;
    } else if (midSquared < value) {
      lo = mid + 1n;
    } else {
      hi = mid - 1n;
    }
  }

  // Return the floor value (closest integer less than or equal to square root)
  return hi;
}

export default spread;
