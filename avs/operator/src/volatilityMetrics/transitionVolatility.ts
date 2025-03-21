import { VolatilitySnapshot } from "../types";

const LAMBDA = 0.9;

/**
 * Transition Volatility Component: Standard deviation of transition metrics using EWMA
 */
const transitionVolatility = (
  snapshots: VolatilitySnapshot[],
  prevVol: number
): number => {
  if (snapshots.length < 3) {
    return 0;
  } else if (snapshots.length === 3) {
    return Math.abs(snapshots[2].transition! - snapshots[1].transition!);
  } else {
    const transitionMetrics = snapshots
      .map((snapshot) => snapshot.transition)
      .filter((metric) => metric !== undefined);
    const len = transitionMetrics.length;

    return Math.sqrt(
      LAMBDA * Math.pow(prevVol, 2) +
        (1 - LAMBDA) *
          Math.pow(transitionMetrics[len - 1] - transitionMetrics[len - 2], 2)
    );
  }
};

export default transitionVolatility;
