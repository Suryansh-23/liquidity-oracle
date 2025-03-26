import { Curve, LiquidityMetricsResult } from "./types";
import Volatility from "./volatilityMetrics";
import Transition from "./transitionMetrics";
import structureMetrics from "./structureMetrics";

export class LiquidityAnalyzer {
  private volatility: Volatility;
  private transition: Transition;
  private currentTick: number;
  private snapshotSize: number;

  constructor(
    maxWindowSize: number,
    snapshotSize: number,
    initialTick: number = 0
  ) {
    this.volatility = new Volatility(maxWindowSize, snapshotSize);
    this.transition = new Transition();
    this.currentTick = initialTick;
    this.snapshotSize = snapshotSize;
  }

  /**
   * Process a new liquidity distribution curve and return comprehensive metrics
   * @param curve The current liquidity distribution curve
   * @param currentTick The current tick position
   * @returns Combined metrics including volatility, structure, and timestamp
   */
  processDistribution(
    curve: Curve,
    currentTick?: number
  ): LiquidityMetricsResult {
    if (currentTick !== undefined) {
      this.currentTick = currentTick;
    }

    // Calculate transition score for the new distribution
    const transitionScore = this.transition.add(curve);

    // Calculate volatility metrics
    const volatilityResult = this.volatility.add(curve, transitionScore);

    // Calculate structure metrics
    const structureResult = structureMetrics(
      curve,
      this.currentTick,
      this.snapshotSize
    );

    return {
      volatility: volatilityResult,
      structure: structureResult,
      timestamp: Date.now(),
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
