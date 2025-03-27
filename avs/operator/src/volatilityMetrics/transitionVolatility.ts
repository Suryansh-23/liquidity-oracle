import { VolatilitySnapshot } from "../types";

const LAMBDA = 0.9;
const SCALE_FACTOR = 10000n; // Scale factor for 4 decimal places precision

/**
 * Transition Volatility Component: Standard deviation of transition metrics using EWMA
 * @returns Scaled bigint value representing volatility
 */
const transitionVolatility = (
  snapshots: VolatilitySnapshot[],
  prevVol: bigint
): bigint => {
  if (snapshots.length < 3) {
    return 0n;
  } else if (snapshots.length === 3) {
    // Calculate absolute difference between latest transitions
    const diff =
      snapshots[2].transition > snapshots[1].transition
        ? snapshots[2].transition - snapshots[1].transition
        : snapshots[1].transition - snapshots[2].transition;

    return diff;
  } else {
    const transitionMetrics = snapshots
      .map((snapshot) => snapshot.transition)
      .filter((metric): metric is bigint => metric !== undefined);

    const len = transitionMetrics.length;

    // Calculate difference squared
    const latestDiff =
      transitionMetrics[len - 1] > transitionMetrics[len - 2]
        ? transitionMetrics[len - 1] - transitionMetrics[len - 2]
        : transitionMetrics[len - 2] - transitionMetrics[len - 1];

    const diffSquared = latestDiff * latestDiff;

    // Apply EWMA formula with scaled bigint arithmetic
    // Using SCALE_FACTOR for decimal precision
    const lambdaScaled = BigInt(Math.floor(LAMBDA * Number(SCALE_FACTOR)));
    const oneMinusLambdaScaled = SCALE_FACTOR - lambdaScaled;

    const term1 = (lambdaScaled * prevVol * prevVol) / SCALE_FACTOR;
    const term2 = (oneMinusLambdaScaled * diffSquared) / SCALE_FACTOR;

    // Calculate square root
    return bigintSqrt(term1 + term2);
  }
};

/**
 * Calculate bigint square root using binary search
 */
function bigintSqrt(value: bigint): bigint {
  if (value < 0n) {
    throw new Error("Square root of negative number is not supported");
  }

  if (value < 2n) {
    return value;
  }

  // Binary search for square root
  let lo = 0n;
  let hi = value;

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

  return hi;
}

export default transitionVolatility;
