import { log2 } from "extra-bigint";
import { K } from "../constants";
import {
  AggregateHistory,
  Vector,
  VolatilityResult,
  VolatilityScores,
  VolatilitySnapshot,
} from "../types";
import { toPrecision } from "../utils";
import aggregateVolatility from "./aggregateVolatility";
import entropyVolatility from "./entropyVolatility";
import ewmx from "./normalize";
import overallVolatility from "./overallVolatility";
import perTickVolatility from "./perTickVolatility";
import temporalDependence from "./temporalVolatility";
import transitionVolatility from "./transitionVolatility";

// Scale factor for 4 decimal places precision
const SCALE_FACTOR = 10000n;

export default class Volatility {
  private maxSize: number;
  private tickSpacing: number;
  private latestDistribution: Vector<number> = [];
  private window: VolatilitySnapshot[] = [];
  private prevTransitionVol: bigint = 0n;
  private aggHistory: AggregateHistory = {
    rsdEMX: 0n,
    rvEMX: 0n,
    rangeEMX: 0n,
    transitionEMX: 0n,
    perTickEMX: 0n,
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
    transition: bigint
  ): VolatilityResult {
    /*
      s: transition = -1n
      s+1: transition = t_0
      s+2: transition = t_1
      .
      .
      .
      s+n: transition = t_n
    */
    this.latestDistribution = distribution;
    if (transition === -1n) {
      this.prevTransitionVol = 0n;
      this.window.push({
        liquidity: distribution,
        transition: 0n,
      });
      return {
        overall: 0n,
        transition: 0n,
        perTick: 0n,
        entropy: 0n,
        temporal: 0n,
        aggregate: 0n,
      };
    } else {
      this.prevTransitionVol = transition;
      this.window.push({
        liquidity: distribution,
        transition,
      });
      if (this.window.length > this.maxSize) {
        this.window.shift();
        return this.compute(currentTick);
      } else {
        return {
          overall: 0n,
          transition: 0n,
          perTick: 0n,
          entropy: 0n,
          temporal: 0n,
          aggregate: 0n,
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
    console.log(
      "PerTick Value w/o EMX:",
      perTickVolatility(this.window, currentTick, this.tickSpacing)
    );

    // Calculate entropy with bigint scaling
    const entropyVal = entropyVolatility(this.window);
    console.log("Entropy value:", entropyVal);
    // Approximate log calculation for denominator scaling
    // Convert bigints to numbers for this calculation
    const tickRange = 2 * K + 1;
    const logScaled = log2(BigInt(tickRange));

    // Normalize entropy by dividing by log(range)
    const entropy = logScaled > 0n ? entropyVal / logScaled : 0n;
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
