import { AggregateHistory, VolatilitySnapshot } from "../types";
import { sqrt, variance } from "extra-bigint";
import ewmx from "./normalize";

type OverallVolatilityResult = {
  overallVolatility: bigint;
} & Pick<AggregateHistory, "rsdEMX" | "rvEMX" | "rangeEMX">;

/**
 * Overall Volatility Component: Combines rolling standard deviation, realized volatility, and range
 */
const overallVolatility = (
  snapshots: VolatilitySnapshot[],
  aggHistory: Pick<AggregateHistory, "rsdEMX" | "rvEMX" | "rangeEMX">
): OverallVolatilityResult => {
  // Calculate global liquidity for each snapshot
  const globalLiquidity = snapshots.map((snapshot) =>
    snapshot.liquidity.reduce((acc, point) => acc + point[1], 0n)
  );

  // Calculate rolling standard deviation
  const [rsd, rsdEMX] = ewmx(
    sqrt(variance(...globalLiquidity)),
    aggHistory.rsdEMX
  );

  // Calculate differences for realized volatility
  const diffs = globalLiquidity
    .slice(1)
    .map((val, idx) =>
      val > globalLiquidity[idx]
        ? val - globalLiquidity[idx]
        : globalLiquidity[idx] - val
    );

  // Calculate realized volatility
  let squaredDiffSum = 0n;
  for (const diff of diffs) {
    squaredDiffSum += diff * diff;
  }
  const rv_unscaled = sqrt(squaredDiffSum);
  const [rv, rvEMX] = ewmx(rv_unscaled, aggHistory.rvEMX);

  // Calculate range volatility
  let maxVal = globalLiquidity.length > 0 ? globalLiquidity[0] : 0n;
  let minVal = maxVal;

  for (const val of globalLiquidity) {
    if (val > maxVal) maxVal = val;
    if (val < minVal) minVal = val;
  }

  const rangeVal = maxVal - minVal;
  const [rangeVol, rangeEMX] = ewmx(rangeVal, aggHistory.rangeEMX);

  // Calculate overall volatility as average
  const overallVolatility = (rsd + rv + rangeVol) / 3n;

  return {
    overallVolatility,
    rsdEMX,
    rvEMX,
    rangeEMX,
  };
};

export default overallVolatility;
