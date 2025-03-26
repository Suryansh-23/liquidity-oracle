import {
  AggregateHistory,
  Vector,
  VolatilityResult,
  VolatilityScores,
  VolatilitySnapshot,
} from "../types";
import { MAX_TICK, MIN_TICK, toPrecision } from "../utils";
import aggregateVolatility from "./aggregateVolatility";

import entropyVolatility from "./entropyVolatility";
import ewmx from "./normalize";
import overallVolatility from "./overallVolatility";
import perTickVolatility from "./perTickVolatility";
import temporalDependence from "./temporalVolatility";
import transitionVolatility from "./transitionVolatility";

export default class Volatility {
  private maxSize: number;
  private tickSpacing: number;
  private latestDistribution: Vector<number> = [];
  private window: VolatilitySnapshot[] = [];
  private prevTransitionVol: number = 0;

  private aggHistory: AggregateHistory = {
    rsdEMX: 0,
    rvEMX: 0,
    rangeEMX: 0,
    transitionEMX: 0,
    perTickEMX: 0,
  };

  constructor(maxSize: number, tickSpacing: number) {
    this.maxSize = maxSize;
    this.tickSpacing = tickSpacing;
  }

  /**
   * Add a new liquidity distribution snapshot to the window
   * @param distribution An array representing liquidity distribution across ticks
   */
  add(
    currentTick: number,
    distribution: Vector<number>,
    transition: number
  ): VolatilityResult {
    /*
      s: transition = -1
      s+1: transition = t_0
      s+2: transition = t_1
      .
      .
      .
      s+n: transition = t_n
    */
    this.latestDistribution = distribution;
    if (transition === -1) {
      this.prevTransitionVol = 0;
      this.window.push({
        liquidity: distribution,
        transition: 0,
      });

      return {
        overall: 0,
        transition: 0,
        perTick: 0,
        entropy: 0,
        temporal: 0,
        aggregate: 0,
      };
    } else {
      this.prevTransitionVol = transition;
      this.window.push({
        liquidity: distribution,
        transition,
      });

      if (this.window.length >= this.maxSize) {
        return this.compute(currentTick);
      } else {
        return {
          overall: 0,
          transition: 0,
          perTick: 0,
          entropy: 0,
          temporal: 0,
          aggregate: 0,
        };
      }
    }
  }

  /**
   * Compute all scores and return both individual and aggregated results
   */
  private compute(currentTick: number): VolatilityResult {
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
      perTickVolatility(this.window, currentTick, this.tickSpacing),
      this.aggHistory.perTickEMX
    );

    const entropy = toPrecision(
      entropyVolatility(this.window) /
        Math.log(Math.trunc((MAX_TICK - MIN_TICK) / this.tickSpacing))
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
  getLatestSnapshot(): Vector<number> {
    return this.latestDistribution;
  }

  /**
   * Clear all snapshots from the window
   */
  clear(): void {
    this.window = [];
  }
}
