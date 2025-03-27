import { Curve, Vector, VectorPair } from "../types";
import { curveToVectorPair, toPrecision } from "../utils";
import cosine from "./cosine";
import hellingerDistance from "./hellinger";
import wassersteinDistance from "./wasserstein";

const SCALE_FACTOR = 10000n; // For 4 decimal places precision

/**
 * Configuration for the composite metric weights and parameters
 */
export interface CompositeMetricConfig {
  /**
   * Weight for the Wasserstein distance component (default: 0.4)
   */
  wassersteinWeight?: bigint;

  /**
   * Weight for the Hellinger distance component (default: 0.3)
   */
  hellingerWeight?: bigint;

  /**
   * Weight for the Cosine distance component (default: 0.3)
   */
  cosineWeight?: bigint;
}

/**
 * Default configuration for the composite metric
 */
const DEFAULT_CONFIG: Required<CompositeMetricConfig> = {
  wassersteinWeight: 4000n, // 0.4 * SCALE_FACTOR
  hellingerWeight: 3000n, // 0.3 * SCALE_FACTOR
  cosineWeight: 3000n, // 0.3 * SCALE_FACTOR
};

/**
 * Convert cosine similarity [-1, 1] to a distance metric [0, 1]
 */
const cosineToDistance = (similarity: bigint): bigint => {
  // Convert cosine similarity to distance: (1 - similarity) / 2
  // For bigint calculation with scaling
  return (SCALE_FACTOR - similarity) / 2n;
};

/**
 * Normalize Wasserstein distance to [0, 1] range using dynamic min-max scaling
 * based on the differences between elements in the two distributions
 */
const normalizeWasserstein = (
  distance: bigint,
  vp: VectorPair<number>
): bigint => {
  const [p, q] = vp;
  let minDiff = Infinity;
  let maxDiff = -Infinity;

  // Calculate min and max differences between all pairs of elements
  for (let i = 0; i < p.length; i++) {
    const pVal = p[i][1];
    for (let j = 0; j < q.length; j++) {
      // Calculate absolute difference
      const diff =
        pVal > q[j][1] ? Number(pVal - q[j][1]) : Number(q[j][1] - pVal);

      minDiff = Math.min(minDiff, diff);
      maxDiff = Math.max(maxDiff, diff);
    }
  }

  // If there's no difference between distributions, return 0
  if (maxDiff === minDiff) {
    return 0n;
  }

  // Apply min-max normalization with scaling for bigint
  // Formula: (distance - minDiff) / (maxDiff - minDiff)
  const minDiffBigInt = BigInt(Math.floor(minDiff));
  const maxMinDiffBigInt = BigInt(Math.floor(maxDiff - minDiff));

  if (maxMinDiffBigInt === 0n) {
    return 0n;
  }

  // Scale for precision
  return ((distance - minDiffBigInt) * SCALE_FACTOR) / maxMinDiffBigInt;
};

class Transition {
  prevDist: Vector<number> = [];

  add(distribution: Vector<number>): bigint {
    if (this.prevDist.length === 0) {
      this.prevDist = distribution;
      return -1n;
    }

    if (this.prevDist.length !== distribution.length) {
      throw new Error("Distribution lengths do not match");
    }

    const vp = [this.prevDist, distribution] as VectorPair<number>;
    const transition = this.compute(vp);
    this.prevDist = distribution;

    return transition;
  }

  /**
   * Calculate a composite distance metric that combines Wasserstein, Hellinger, and Cosine metrics.
   *
   * The composite metric is a weighted sum of:
   * - Normalized Wasserstein distance (range [0, 1])
   * - Hellinger distance (already in range [0, 1])
   * - Converted Cosine similarity (converted to distance in range [0, 1])
   *
   * @param vp - A pair of vectors representing the two distributions to compare
   * @param config - Optional configuration for weights and parameters
   * @returns A bigint in range [0, SCALE_FACTOR] representing the composite distance
   */
  compute = (
    vp: VectorPair<number>,
    config: CompositeMetricConfig = {}
  ): bigint => {
    // Merge provided config with defaults
    const finalConfig: Required<CompositeMetricConfig> = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    const { wassersteinWeight, hellingerWeight, cosineWeight } = finalConfig;

    // Calculate individual metrics
    const rawWassersteinDist = wassersteinDistance(vp);
    const wassersteinDist = normalizeWasserstein(rawWassersteinDist, vp);
    const hellingerDist = hellingerDistance(vp);
    const cosineDist = cosineToDistance(cosine(vp));

    // Combine metrics using weighted sum
    return toPrecision(
      (wassersteinWeight * wassersteinDist) / SCALE_FACTOR +
        (hellingerWeight * hellingerDist) / SCALE_FACTOR +
        (cosineWeight * cosineDist) / SCALE_FACTOR
    );
  };
}

export default Transition;
