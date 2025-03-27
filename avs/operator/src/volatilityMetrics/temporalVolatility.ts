import { VolatilitySnapshot } from "../types";

const SCALE_FACTOR = 10000n; // Scale factor for 4 decimal places

/**
 * Calculate sample correlation with bigint values
 * @param x First array of values
 * @param y Second array of values
 * @returns Scaled bigint correlation coefficient
 */
function bigintSampleCorrelation(x: bigint[], y: bigint[]): bigint {
  if (x.length !== y.length || x.length < 2) {
    return 0n;
  }

  // Calculate means
  const sumX = x.reduce((acc, val) => acc + val, 0n);
  const sumY = y.reduce((acc, val) => acc + val, 0n);
  const meanX = sumX / BigInt(x.length);
  const meanY = sumY / BigInt(y.length);

  // Calculate covariance and variances with scaling
  let covariance = 0n;
  let varianceX = 0n;
  let varianceY = 0n;

  for (let i = 0; i < x.length; i++) {
    const diffX = x[i] > meanX ? x[i] - meanX : meanX - x[i];
    const diffY = y[i] > meanY ? y[i] - meanY : meanY - y[i];
    const signX = x[i] >= meanX ? 1n : -1n;
    const signY = y[i] >= meanY ? 1n : -1n;

    covariance += signX * signY * diffX * diffY;
    varianceX += diffX * diffX;
    varianceY += diffY * diffY;
  }

  // Check for zero variance
  if (varianceX === 0n || varianceY === 0n) {
    return 0n;
  }

  // Calculate correlation with scaling
  const denominator = bigintSqrt(varianceX * varianceY);
  return (covariance * SCALE_FACTOR) / denominator;
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
 * Temporal Dependence Component: Based on lag-1 autocorrelation
 */
const temporalDependence = (snapshots: VolatilitySnapshot[]): bigint => {
  const globalLiquidity = snapshots.map((snapshot) =>
    snapshot.liquidity.reduce((acc, point) => acc + point[1], 0n)
  );

  if (globalLiquidity.length < 2) return 0n;

  const lag1 = globalLiquidity.slice(0, -1);
  const lag0 = globalLiquidity.slice(1);

  const correlation = bigintSampleCorrelation(lag0, lag1);

  // Calculate absolute value
  const absCorrelation = correlation < 0n ? -correlation : correlation;

  // Return 1 - |correlation|
  return SCALE_FACTOR - absCorrelation;
};

export default temporalDependence;
