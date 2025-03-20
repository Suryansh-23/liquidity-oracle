import { standardDeviation } from "simple-statistics";
import { VolatilitySnapshot } from "../types";

/**
 * Transition Volatility Component: Standard deviation of transition metrics
 */
const transitionVolatility = (snapshots: VolatilitySnapshot[]): number => {
  const transitionMetrics = snapshots
    .map((snapshot) => snapshot.transition)
    .slice(1)
    .filter((metric) => metric !== undefined);

  return standardDeviation(transitionMetrics);
};

export default transitionVolatility;
