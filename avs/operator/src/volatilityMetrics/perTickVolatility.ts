import { standardDeviation } from "simple-statistics";
import { VolatilitySnapshot } from "../types";
import { MIN_TICK } from "../utils";

/*
 * Get Weight for a tickIndex
 * @param tickIndex - The index of the tick
 * @param center - The center index of the tick range
 */
const getWeight = (tickIndex: number, center: number): number => {
  const distance = Math.abs(tickIndex - center);
  return 1 / (distance + 1);
};

/**
 * Per-Tick Volatility Component: Weighted average of per-tick standard deviations
 */
const perTickVolatility = (
  snapshots: VolatilitySnapshot[],
  currentTick: number,
  tickSpacing: number
): number => {
  const center = Math.trunc((currentTick - MIN_TICK) / tickSpacing);
  const perTickStd: number[] = [];

  for (let i = 0; i < snapshots.length; i++) {
    const liqAtTick = snapshots.map((row) => row.liquidity[i][1]);
    perTickStd.push(standardDeviation(liqAtTick));
  }

  return (
    perTickStd.reduce((sum, std, i) => {
      const weight = getWeight(i, center);
      return sum + std * weight;
    }, 0) / perTickStd.reduce((sum, _, i) => sum + getWeight(i, center), 0)
  );
};

export default perTickVolatility;
