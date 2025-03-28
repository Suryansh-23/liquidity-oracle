import { Vector } from "../types";
import { sumNormalize } from "../utils";

/**
 * Calculates the Liquidity Concentration of the Liquidity Distribution using Herfindahl-Hirschman Index
 * @param dist Vector representing liquidity distribution
 * @returns Normalized HHI value between 0 and 1
 */
const concentration = (dist: Vector<number>): bigint => {
  const normalizedWeights = sumNormalize(dist);
  const n = BigInt(dist.length);

  // Calculate sum of squares using bigint with scaling
  const scaleFactor = 10000n;
  const sumSquares = normalizedWeights.reduce(
    (sum, point) => sum + point[1] * scaleFactor * (point[1] * scaleFactor),
    0n
  );

  // Calculate using bigint arithmetic with proper scaling for decimal precision
  const oneOverN = (scaleFactor * scaleFactor) / n;
  const oneMinusOneOverN = scaleFactor * scaleFactor - oneOverN;

  // HHI calculation: (sumSquares - oneOverN) / oneMinusOneOverN
  const numerator = sumSquares - oneOverN;
  const denominator = oneMinusOneOverN;

  return numerator / denominator;
};

export default concentration;
