import { ComputeConfig, RunnerConfig, ComputeResults } from "./types";
import WindowManager from "./windowManager";

class ComputeRunner {
  private windowManager: WindowManager;
  private computeConfigs: Map<string, ComputeConfig>;
  private aggregator: RunnerConfig["aggregator"];

  constructor(config: RunnerConfig) {
    this.windowManager = new WindowManager(config.windowSize);
    this.computeConfigs = new Map(
      config.computeConfigs.map((conf) => [conf.id, conf])
    );
    this.aggregator = config.aggregator;
  }

  /**
   * Add a new liquidity distribution snapshot to the window and compute all scores
   * @param distribution An array representing liquidity distribution across ticks
   */
  addValue(distribution: number[] | bigint[]): ComputeResults {
    this.windowManager.add(distribution);
    return this.compute();
  }

  /**
   * Compute all scores and return both individual and aggregated results
   */
  private compute(): ComputeResults {
    const window = this.windowManager.getWindow();
    const individualScores = new Map<string, bigint>();
    const weights = new Map<string, bigint>();

    for (const [id, config] of this.computeConfigs) {
      individualScores.set(id, config.compute(window));
      weights.set(id, config.weight);
    }

    return {
      individualScores,
      aggregatedScore: this.aggregator(individualScores, weights),
    };
  }

  /**
   * Clear the window
   */
  clear(): void {
    this.windowManager.clear();
  }

  /**
   * Get the current window data containing all liquidity distribution snapshots
   */
  getWindow(): bigint[][] {
    return this.windowManager.getWindow();
  }
}

export default ComputeRunner;
