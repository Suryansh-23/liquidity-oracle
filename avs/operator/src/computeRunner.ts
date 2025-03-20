import WindowManager from "./windowManager";
import { ComputeConfig, RunnerConfig, ComputeResults } from "./types";

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
   * Add a new value to the window and compute all scores
   */
  addValue(value: number): ComputeResults {
    this.windowManager.add(value);
    return this.compute();
  }

  /**
   * Compute all scores and return both individual and aggregated results
   */
  private compute(): ComputeResults {
    const window = this.windowManager.getWindow();
    const individualScores = new Map<string, number>();
    const weights = new Map<string, number>();

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
   * Get the current window data
   */
  getWindow(): number[] {
    return this.windowManager.getWindow();
  }
}

export default ComputeRunner;
