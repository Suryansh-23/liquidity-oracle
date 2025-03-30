import { sqrt, variance } from "extra-bigint";
import { SCALE_FACTOR } from "../constants";
import { VolatilitySnapshot } from "../types";

/**
 * Get Weight for a tickIndex
 * @param tickIndex - The index of the tick
 * @param center - The center index of the tick range
 * @returns Scaled bigint weight
 */
const getWeight = (tickIndex: number, center: number): bigint => {
  const distance = Math.abs(tickIndex - center);
  // Calculate 1/(distance+1) with scaling
  return SCALE_FACTOR / BigInt(distance + 1);
};

/**
 * Per-Tick Volatility Component: Weighted average of per-tick standard deviations
 * Normalized between 0 and 1
 */
const perTickVolatility = (
  snapshots: VolatilitySnapshot[],
  currentTick: number,
  tickSpacing: number
): bigint => {
  const perTickStd: bigint[] = [];
  let maxStd = 0n;

  // Calculate standard deviations and track maximum
  for (let i = 0; i < snapshots[0].liquidity.length; i++) {
    const liqAtTick = snapshots.map((row) => row.liquidity[i][1]);
    const std = sqrt(variance(...liqAtTick));
    perTickStd.push(std);
    if (std > maxStd) maxStd = std;
  }

  // Calculate weighted sum of normalized standard deviations
  let weightedSum = 0n;
  let weightSum = 0n;

  for (let i = 0; i < perTickStd.length; i++) {
    const weight = getWeight(i, currentTick);
    // Normalize by dividing by maxStd (with scaling)
    const normalizedStd =
      maxStd > 0n ? (perTickStd[i] * SCALE_FACTOR) / maxStd : 0n;
    weightedSum += (normalizedStd * weight) / SCALE_FACTOR;
    weightSum += weight;
  }

  // Return weighted average
  return weightSum > 0n ? (weightedSum * SCALE_FACTOR) / weightSum : 0n;
};

export default perTickVolatility;
