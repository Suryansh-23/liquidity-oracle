import { sampleCorrelation } from "simple-statistics";
import { VolatilitySnapshot } from "../types";

/**
 * Temporal Dependence Component: Based on lag-1 autocorrelation
 */
const temporalDependence = (snapshots: VolatilitySnapshot[]): number => {
  const globalLiquidity = snapshots.map((snapshot) =>
    snapshot.liquidity.reduce((acc, point) => acc + point[1], 0)
  );

  if (globalLiquidity.length < 2) return 0;

  const lag1 = globalLiquidity.slice(0, -1);
  return 1 - Math.abs(sampleCorrelation(globalLiquidity, lag1));
};

export default temporalDependence;
