import { standardDeviation } from "simple-statistics";
import { AggregateHistory, VolatilitySnapshot } from "../types";
import ewmx from "./normalize";

type OverallVolatilityResult = {
  overallVolatility: number;
} & Pick<AggregateHistory, "rsdEMX" | "rvEMX" | "rangeEMX">;

/**
 * Overall Volatility Component: Combines rolling standard deviation, realized volatility, and range
 */
const overallVolatility = (
  snapshots: VolatilitySnapshot[],
  aggHistory: Pick<AggregateHistory, "rsdEMX" | "rvEMX" | "rangeEMX">
): OverallVolatilityResult => {
  const globalLiquidity = snapshots.map((snapshot) =>
    snapshot.liquidity.reduce((acc, point) => acc + point[1], 0)
  );

  const [rsd, rsdEMX] = ewmx(
    standardDeviation(globalLiquidity),
    aggHistory.rsdEMX
  );
  const diffs = globalLiquidity
    .slice(1)
    .map((val, idx) => val - globalLiquidity[idx]);
  const [rv, rvEMX] = ewmx(
    Math.sqrt(diffs.reduce((acc, d) => acc + d * d, 0)),
    aggHistory.rvEMX
  );
  const [rangeVol, rangeEMX] = ewmx(
    Math.max(...globalLiquidity) - Math.min(...globalLiquidity),
    aggHistory.rangeEMX
  );

  const overallVolatility = (rsd + rv + rangeVol) / 3;

  return {
    overallVolatility,
    rsdEMX,
    rvEMX,
    rangeEMX,
  };
};

export default overallVolatility;
