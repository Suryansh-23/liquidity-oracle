import { Curve, LiquidityMetricsResult, Vector } from "./types";
import Volatility from "./volatilityMetrics";
import Transition from "./transitionMetrics";
import structureMetrics from "./structureMetrics";

export class LiquidityAnalyzer {
  private volatility: Volatility;
  private transition: Transition;
  private currentTick: number;
  private tickSpacing: number;

  constructor(
    maxWindowSize: number,
    tickSpacing: number,
    initialTick: number = 0
  ) {
    this.volatility = new Volatility(maxWindowSize, tickSpacing);
    this.transition = new Transition();
    this.currentTick = initialTick;
    this.tickSpacing = tickSpacing;
  }

  /**
   * Process a new liquidity distribution curve and return comprehensive metrics
   * @param dist The current liquidity distribution
   * @param currentTick The current tick position
   * @returns Combined metrics including volatility, structure, and timestamp
   */
  processDistribution(
    dist: Vector<number>,
    currentTick: number
  ): LiquidityMetricsResult {
    console.log("Processing distribution for tick:", currentTick);
    if (currentTick !== undefined) {
      this.currentTick = currentTick;
    }

    // Calculate transition score for the new distribution
    const transitionScore = this.transition.add(dist);

    // Calculate volatility metrics
    const volatilityResult = this.volatility.add(
      currentTick,
      dist,
      transitionScore
    );

    // Calculate structure metrics
    const structureResult = structureMetrics(
      dist,
      this.currentTick,
      this.tickSpacing
    );

    return {
      volatility: volatilityResult,
      structure: structureResult,
    };
  }

  /**
   * Get the current window of volatility snapshots
   */
  getVolatilityWindow() {
    return this.volatility.getWindow();
  }

  /**
   * Get the latest distribution curve
   */
  getLatestDistribution(): Curve {
    return this.volatility.getLatestSnapshot();
  }

  /**
   * Reset the analyzer state
   */
  reset(): void {
    this.volatility.clear();
    this.transition = new Transition();
  }
}
