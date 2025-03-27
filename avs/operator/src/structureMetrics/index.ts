import { StructureMetricResults, Vector } from "../types";
import { toPrecision } from "../utils";
import concentration from "./concentration";
import depth from "./depth";
import spread from "./spread";

/**
 * Calculate structure metrics for a liquidity distribution
 * @param dist Distribution vector
 * @param currentTick Current price tick
 * @param tickSpacing Spacing between ticks
 * @returns Structure metrics using bigint values
 */
const structureMetrics = (
  dist: Vector<number>,
  currentTick: number,
  tickSpacing: number
): StructureMetricResults => {
  const liquiditySpread = toPrecision(spread(dist, currentTick));
  const liquidityDepth = toPrecision(depth(dist, currentTick, tickSpacing));
  const liquidityConcentration = toPrecision(concentration(dist));

  return {
    liquiditySpread,
    liquidityDepth,
    liquidityConcentration,
  };
};

export default structureMetrics;
