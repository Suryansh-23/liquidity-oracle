import computeTransitionDelta from "../transitionMetrics";
import {
  Curve,
  VolatilityResult,
  VolatilityScores,
  VolatilitySnapshot,
} from "../types";
import { curveToVectorPair } from "../utils";
import aggregateVolatility from "./aggregateVolatility";

import entropyVolatility from "./entropyVolatility";
import overallVolatility from "./overallVolatility";
import perTickVolatility from "./perTickVolatility";
import temporalDependence from "./temporalVolatility";
import transitionVolatility from "./transitionVolatility";

export default class Volatility {
  private latestDistribution: Curve = [];
  private window: VolatilitySnapshot[] = [];
  private maxSize: number;
  private snapshotSize: number;

  constructor(maxSize: number, snapshotSize: number) {
    this.maxSize = maxSize;
    this.snapshotSize = snapshotSize;
  }

  /**
   * Add a new liquidity distribution snapshot to the window
   * @param distribution An array representing liquidity distribution across ticks
   */
  add(distribution: Curve): VolatilityResult | undefined {
    if (this.window.length >= this.maxSize) {
      this.window.shift();
    }

    if (this.latestDistribution) {
      const vp = curveToVectorPair(this.latestDistribution, distribution);
      const transition = computeTransitionDelta(vp);
      this.window.push({
        liquidity: distribution,
        transition,
      });
    } else {
      this.window.push({
        liquidity: distribution,
      });
    }

    this.latestDistribution = distribution;

    if (this.window.length >= this.maxSize) {
      return this.compute();
    }
  }

  /**
   * Compute all scores and return both individual and aggregated results
   */
  private compute(): VolatilityResult {
    const overall = overallVolatility(this.window);
    const transition = transitionVolatility(this.window);
    const perTick = perTickVolatility(this.window, this.snapshotSize);
    const entropy = entropyVolatility(this.window);
    const temporal = temporalDependence(this.window);

    const scores: VolatilityScores = {
      overall,
      transition,
      perTick,
      entropy,
      temporal,
    };

    return {
      ...scores,
      aggregate: aggregateVolatility(scores),
    };
  }

  /**
   * Get the current window containing all liquidity distribution snapshots
   */
  getWindow(): VolatilitySnapshot[] {
    return this.window;
  }

  /*
   * Get the latest distribution from the window
   */
  getLatestSnapshot(): Curve {
    return this.latestDistribution;
  }

  /**
   * Clear all snapshots from the window
   */
  clear(): void {
    this.window = [];
  }
}
