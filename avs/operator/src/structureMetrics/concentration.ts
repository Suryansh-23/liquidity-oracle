import { Vector } from "../types";
import { sumNormalize } from "../utils";

/**
 * Calculates the Liquidity Concentration of the Liquidity Distribution using Herfindahl-Hirschman Index
 * @param dist Vector representing liquidity distribution
 * @returns Normalized HHI value between 0 and 1
 */
const concentration = (dist: Vector<number>): number => {
  const normalizedWeights = sumNormalize(dist);
  const n = dist.length;
  const sumSquares = normalizedWeights.reduce(
    (sum, point) => sum + point[1] * point[1],
    0
  );

  return 1 - (sumSquares - 1 / n) / (1 - 1 / n);
};

export default concentration;
