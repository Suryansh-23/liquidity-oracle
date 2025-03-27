/**
 * A class to manage a sliding window of liquidity distribution data
 */
class WindowManager {
  private windowSize: number;
  private window: bigint[][];

  constructor(windowSize: number) {
    this.windowSize = windowSize;
    this.window = [];
  }

  /**
   * Add a new distribution to the window
   * @param distribution The new liquidity distribution to add
   */
  add(distribution: number[] | bigint[]): void {
    // Convert numbers to bigints if necessary
    const bigintDistribution = distribution.map((val) =>
      typeof val === "number" ? BigInt(val) : val
    ) as bigint[];

    this.window.push(bigintDistribution);

    // Keep window size limited
    if (this.window.length > this.windowSize) {
      this.window.shift();
    }
  }

  /**
   * Get the current window data
   * @returns The current window containing all distributions
   */
  getWindow(): bigint[][] {
    return this.window;
  }

  /**
   * Clear the window
   */
  clear(): void {
    this.window = [];
  }
}

export default WindowManager;
