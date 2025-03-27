import { VolatilitySnapshot } from "../types";

// Scaling factor for bigint calculations with 4 decimal places
const SCALE_FACTOR = 10000n;
const LOG_SCALE = 10000n; // Scale for logarithmic calculations

/**
 * Entropy-Based Volatility Component: Standard deviation of snapshot entropies
 * @returns Scaled bigint value representing volatility
 */
const entropyVolatility = (snapshots: VolatilitySnapshot[]): bigint => {
  const entropies = snapshots.map((snapshot) =>
    getEntropy(snapshot.liquidity.map((point) => point[1]))
  );

  // Calculate mean
  const sum = entropies.reduce((acc, val) => acc + val, 0n);
  const mean = sum / BigInt(entropies.length);

  // Calculate sum of squared differences
  const squaredDiffs = entropies.map((val) => {
    const diff = val > mean ? val - mean : mean - val;
    return diff * diff;
  });

  const sumSquaredDiffs = squaredDiffs.reduce((acc, val) => acc + val, 0n);

  // Calculate standard deviation (with appropriate scaling)
  return bigintSqrt(
    (sumSquaredDiffs * SCALE_FACTOR) / BigInt(entropies.length)
  );
};

/**
 * Calculate entropy of a distribution using bigint arithmetic
 * @returns Scaled bigint representation of entropy
 */
const getEntropy = (snapshot: bigint[]): bigint => {
  const total = snapshot.reduce((acc, val) => acc + val, 0n);
  if (total === 0n) return 0n;

  // Pre-compute probabilities scaled by SCALE_FACTOR
  const probs = snapshot.map((val) => (val * SCALE_FACTOR) / total);

  // Calculate entropy with scaled logarithm
  return -probs.reduce((acc, p) => {
    if (p <= 0n) return acc;

    // Approximate log(p) using Taylor series or lookup table
    // For simplicity, we'll use a scaling approach that calls Math.log
    // In a production setting, consider a proper bigint logarithm implementation
    const scaledLog = bigintLog(p);

    return acc + (p * scaledLog) / (SCALE_FACTOR * LOG_SCALE);
  }, 0n);
};

/**
 * Approximate natural logarithm for bigint
 * @param x - Scaled bigint value (scaled by SCALE_FACTOR)
 * @returns Scaled approximation of ln(x/SCALE_FACTOR) * LOG_SCALE
 */
function bigintLog(x: bigint): bigint {
  // Convert scaled bigint to floating point for Math.log
  const float = Number(x) / Number(SCALE_FACTOR);
  // Calculate log and scale the result
  return BigInt(Math.floor(Math.log(float) * Number(LOG_SCALE)));
}

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

export default entropyVolatility;
