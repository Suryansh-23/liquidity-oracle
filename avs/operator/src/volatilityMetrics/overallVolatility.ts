import { AggregateHistory, VolatilitySnapshot } from "../types";
import ewmx from "./normalize";

// Scale factor for bigint calculations with 4 decimal places
const SCALE_FACTOR = 10000n;

type OverallVolatilityResult = {
  overallVolatility: bigint;
} & Pick<AggregateHistory, "rsdEMX" | "rvEMX" | "rangeEMX">;

/**
 * Calculates standard deviation using bigint arithmetic
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
 * Overall Volatility Component: Combines rolling standard deviation, realized volatility, and range
 */
const overallVolatility = (
  snapshots: VolatilitySnapshot[],
  aggHistory: Pick<AggregateHistory, "rsdEMX" | "rvEMX" | "rangeEMX">
): OverallVolatilityResult => {
  // Calculate global liquidity for each snapshot
  const globalLiquidity = snapshots.map((snapshot) =>
    snapshot.liquidity.reduce((acc, point) => acc + point[1], 0n)
  );

  // Calculate rolling standard deviation
  const [rsd, rsdEMX] = ewmx(
    bigintStandardDeviation(globalLiquidity),
    aggHistory.rsdEMX
  );

  // Calculate differences for realized volatility
  const diffs = globalLiquidity
    .slice(1)
    .map((val, idx) =>
      val > globalLiquidity[idx]
        ? val - globalLiquidity[idx]
        : globalLiquidity[idx] - val
    );

  // Calculate realized volatility
  let squaredDiffSum = 0n;
  for (const diff of diffs) {
    squaredDiffSum += diff * diff;
  }
  const rv_unscaled = bigintSqrt(squaredDiffSum);
  const [rv, rvEMX] = ewmx(rv_unscaled, aggHistory.rvEMX);

  // Calculate range volatility
  let maxVal = globalLiquidity.length > 0 ? globalLiquidity[0] : 0n;
  let minVal = maxVal;

  for (const val of globalLiquidity) {
    if (val > maxVal) maxVal = val;
    if (val < minVal) minVal = val;
  }

  const rangeVal = maxVal - minVal;
  const [rangeVol, rangeEMX] = ewmx(rangeVal, aggHistory.rangeEMX);

  // Calculate overall volatility as average
  const overallVolatility = (rsd + rv + rangeVol) / 3n;

  return {
    overallVolatility,
    rsdEMX,
    rvEMX,
    rangeEMX,
  };
};

export default overallVolatility;
