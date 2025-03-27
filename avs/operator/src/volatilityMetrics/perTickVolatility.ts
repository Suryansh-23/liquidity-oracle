import { VolatilitySnapshot } from "../types";
import { MIN_TICK } from "../utils";

const SCALE_FACTOR = 10000n; // Scale factor for 4 decimal places

/**
 * Get Weight for a tickIndex
 * @param tickIndex - The index of the tick
 * @param center - The center index of the tick range
 * @returns Scaled bigint weight
 */
const getWeight = (tickIndex: number, center: number): bigint => {
  const distance = Math.abs(tickIndex - center);
  // Calculate 1/(distance+1) with scaling
  return SCALE_FACTOR / BigInt(distance + 1);
};

/**
 * Calculate standard deviation using bigint arithmetic
 * @param values Array of bigint values
 * @returns A scaled bigint representing the standard deviation
 */
function bigintStandardDeviation(values: bigint[]): bigint {
  if (values.length <= 1) {
    return 0n;
  }

  // Calculate mean
  const sum = values.reduce((acc, val) => acc + val, 0n);
  const mean = sum / BigInt(values.length);

  // Calculate sum of squared differences
  const squaredDiffs = values.map((value) => {
    const diff = value > mean ? value - mean : mean - value;
    return diff * diff;
  });

  const sumSquaredDiffs = squaredDiffs.reduce((acc, val) => acc + val, 0n);

  // Calculate standard deviation with proper scaling
  return bigintSqrt((sumSquaredDiffs * SCALE_FACTOR) / BigInt(values.length));
}

/**
 * Calculate square root of a bigint
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

/**
 * Per-Tick Volatility Component: Weighted average of per-tick standard deviations
 */
const perTickVolatility = (
  snapshots: VolatilitySnapshot[],
  currentTick: number,
  tickSpacing: number
): bigint => {
  const center = Math.trunc((currentTick - MIN_TICK) / tickSpacing);
  const perTickStd: bigint[] = [];

  for (let i = 0; i < snapshots[0].liquidity.length; i++) {
    const liqAtTick = snapshots.map((row) => row.liquidity[i][1]);
    perTickStd.push(bigintStandardDeviation(liqAtTick));
  }

  // Calculate weighted sum of standard deviations
  let weightedSum = 0n;
  let weightSum = 0n;

  for (let i = 0; i < perTickStd.length; i++) {
    const weight = getWeight(i, center);
    weightedSum += (perTickStd[i] * weight) / SCALE_FACTOR;
    weightSum += weight;
  }

  // Return weighted average
  return weightSum > 0n ? (weightedSum * SCALE_FACTOR) / weightSum : 0n;
};

export default perTickVolatility;
