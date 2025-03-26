import { Curve, VectorPair } from "../types";
import { curveToVectorPair, toPrecision } from "../utils";
import cosine from "./cosine";
import hellingerDistance from "./hellinger";
import wassersteinDistance from "./wasserstein";

/**
 * Configuration for the composite metric weights and parameters
 */
export interface CompositeMetricConfig {
  /**
   * Weight for the Wasserstein distance component (default: 0.4)
   */
  wassersteinWeight?: number;

  /**
   * Weight for the Hellinger distance component (default: 0.3)
   */
  hellingerWeight?: number;

  /**
   * Weight for the Cosine distance component (default: 0.3)
   */
  cosineWeight?: number;
}

/**
 * Default configuration for the composite metric
 */
const DEFAULT_CONFIG: Required<CompositeMetricConfig> = {
  wassersteinWeight: 0.4,
  hellingerWeight: 0.3,
  cosineWeight: 0.3,
};

/**
 * Convert cosine similarity [-1, 1] to a distance metric [0, 1]
 */
const cosineToDistance = (similarity: number): number => (1 - similarity) / 2;

/**
 * Normalize Wasserstein distance to [0, 1] range using dynamic min-max scaling
 * based on the differences between elements in the two distributions
 */
const normalizeWasserstein = (
  distance: number,
  vp: VectorPair<number>
): number => {
  const [p, q] = vp;
  let minDiff = Infinity;
  let maxDiff = -Infinity;

  // Calculate min and max differences between all pairs of elements
  for (let i = 0; i < p.length; i++) {
    const pVal = p[i][1];
    for (let j = 0; j < q.length; j++) {
      const diff = Math.abs(pVal - q[j][1]);
      minDiff = Math.min(minDiff, diff);
      maxDiff = Math.max(maxDiff, diff);
    }
  }

  // If there's no difference between distributions, return 0
  if (maxDiff === minDiff) {
    return 0;
  }

  // Apply min-max normalization
  return (distance - minDiff) / (maxDiff - minDiff);
};

class Transition {
  prevDist: Curve = [];

  add(distribution: Curve): number {
    if (this.prevDist.length === 0) {
      this.prevDist = distribution;
      return 0;
    }

    const vp = curveToVectorPair(this.prevDist, distribution);
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
   * @returns A number in range [0, 1] representing the composite distance
   */
  compute = (
    vp: VectorPair<number>,
    config: CompositeMetricConfig = {}
  ): number => {
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
      wassersteinWeight * wassersteinDist +
        hellingerWeight * hellingerDist +
        cosineWeight * cosineDist
    );
  };
}

export default Transition;
