import { StructureMetricResults, Vector } from "../types";
import { toPrecision } from "../utils";
import concentration from "./concentration";
import depth from "./depth";
import spread from "./spread";

const structureMetrics = (
  dist: Vector<number>,
  currentTick: number,
  snapshotSize: number
): StructureMetricResults => {
  const liquiditySpread = toPrecision(spread(dist, currentTick));
  const liquidityDepth = toPrecision(depth(dist, currentTick, snapshotSize));
  const liquidityConcentration = toPrecision(concentration(dist));

  return {
    liquiditySpread,
    liquidityDepth,
    liquidityConcentration,
  };
};

export default structureMetrics;
