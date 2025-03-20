import { standardDeviation } from "simple-statistics";
import { VolatilitySnapshot } from "../types";

/**
 * Overall Volatility Component: Combines rolling standard deviation, realized volatility, and range
 */
const overallVolatility = (snapshots: VolatilitySnapshot[]): number => {
  const globalLiquidity = snapshots.map((snapshot) =>
    snapshot.liquidity.reduce((acc, point) => acc + point[1], 0)
  );

  const rsd = standardDeviation(globalLiquidity);
  const diffs = globalLiquidity
    .slice(1)
    .map((val, idx) => val - globalLiquidity[idx]);
  const rv = Math.sqrt(diffs.reduce((acc, d) => acc + d * d, 0));
  const rangeVol = Math.max(...globalLiquidity) - Math.min(...globalLiquidity);
  return (rsd + rv + rangeVol) / 3;
};

export default overallVolatility;
