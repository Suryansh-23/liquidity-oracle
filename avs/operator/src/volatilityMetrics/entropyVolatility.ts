import { log2, sqrt, variance } from "extra-bigint";
import { SCALE_FACTOR } from "../constants";
import { VolatilitySnapshot } from "../types";

/**
 * Entropy-Based Volatility Component: Standard deviation of snapshot entropies
 * @returns Scaled bigint value representing volatility
 */
const entropyVolatility = (snapshots: VolatilitySnapshot[]): bigint => {
  const entropies = snapshots.map((snapshot) =>
    getEntropy(snapshot.liquidity.map((point) => point[1]))
  );
  console.log("Entropies:", entropies);

  return sqrt(variance(...entropies));
};

/**
 * Calculate entropy of a distribution using bigint arithmetic
 * @returns Scaled bigint representation of entropy
 */
const getEntropy = (snapshot: bigint[]): bigint => {
  const total = snapshot.reduce((acc, val) => acc + val, 0n);
  if (total === 0n) return 0n;

  const log_sf = log2(SCALE_FACTOR);

  // Calculate entropy
  let entropy = 0n;
  for (const val of snapshot) {
    if (val > 0n) {
      const prob = (val * SCALE_FACTOR) / total;
      entropy += prob * log2(prob);
    }
  }

  return entropy;
};

export default entropyVolatility;
