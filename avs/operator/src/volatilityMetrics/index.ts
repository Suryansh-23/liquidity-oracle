import computeTransitionDelta from "../transitionMetrics";
import {
  AggregateHistory,
  Curve,
  VolatilityResult,
  VolatilityScores,
  VolatilitySnapshot,
} from "../types";
import { curveToVectorPair, toPrecision } from "../utils";
import aggregateVolatility from "./aggregateVolatility";

import entropyVolatility from "./entropyVolatility";
import ewmx from "./normalize";
import overallVolatility from "./overallVolatility";
import perTickVolatility from "./perTickVolatility";
import temporalDependence from "./temporalVolatility";
import transitionVolatility from "./transitionVolatility";

export default class Volatility {
  private maxSize: number;
  private snapshotSize: number;
  private latestDistribution: Curve = [];
  private window: VolatilitySnapshot[] = [];
  private prevTransitionVol: number = 0;

  private aggHistory: AggregateHistory = {
    rsdEMX: 0,
    rvEMX: 0,
    rangeEMX: 0,
    transitionEMX: 0,
    perTickEMX: 0,
  };

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
    const { overallVolatility: overall, ...emx } = overallVolatility(
      this.window,
      this.aggHistory
    );

    const [transition, transitionEMX] = ewmx(
      transitionVolatility(this.window, this.prevTransitionVol),
      this.aggHistory.transitionEMX
    );
    this.prevTransitionVol = transition;

    const [perTick, perTickEMX] = ewmx(
      perTickVolatility(this.window, this.snapshotSize),
      this.aggHistory.perTickEMX
    );

    const entropy = toPrecision(
      entropyVolatility(this.window) / Math.log(this.snapshotSize)
    );

    const temporal = temporalDependence(this.window);

    const scores: VolatilityScores = {
      overall: toPrecision(overall),
      transition: toPrecision(transition),
      perTick: toPrecision(perTick),
      entropy: toPrecision(entropy),
      temporal: toPrecision(temporal),
    };

    this.aggHistory = {
      ...emx,
      transitionEMX,
      perTickEMX,
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
