import { sqrt, variance, max, min } from "extra-bigint";
import { SCALE_FACTOR } from "../constants";
import { AggregateHistory, VolatilitySnapshot } from "../types";
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
  const baseRsd = sqrt(variance(...globalLiquidity));
  const maxPossibleRsd = sqrt(
    globalLiquidity.reduce((acc, val) => acc + val * val, 0n)
  );
  const normalizedRsd = (baseRsd * SCALE_FACTOR) / maxPossibleRsd;
  const [rsd, rsdEMX] = ewmx(normalizedRsd, aggHistory.rsdEMX);
  // console.log("rsd:", rsd);

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
  const maxLiquidity = globalLiquidity.reduce(
    (max, val) => (val > max ? val : max),
    0n
  );
  const normalizedRv = (rv_unscaled * SCALE_FACTOR) / maxLiquidity;
  const [rv, rvEMX] = ewmx(normalizedRv, aggHistory.rvEMX);
  // console.log("rv:", rv);

  // Calculate range volatility
  let maxVal = max(...globalLiquidity);
  let minVal = min(...globalLiquidity);

  const rangeVal = maxVal - minVal;
  const normalizedRange = (rangeVal * SCALE_FACTOR) / maxVal;
  const [rangeVol, rangeEMX] = ewmx(normalizedRange, aggHistory.rangeEMX);
  // console.log("range:", rangeVol);

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
