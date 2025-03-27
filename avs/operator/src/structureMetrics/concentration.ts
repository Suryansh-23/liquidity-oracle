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

  // Calculate sum of squares using bigint
  const sumSquares = normalizedWeights.reduce(
    (sum, point) => sum + point[1] * point[1],
    0n
  );

  // Calculate using bigint arithmetic with proper scaling for decimal precision
  // Using 10000n as scaling factor for 4 decimal places
  const scaleFactor = 10000n;
  const oneOverN = scaleFactor / n;
  const oneMinusOneOverN = scaleFactor - oneOverN;

  // HHI calculation: 1 - (sumSquares - 1/n) / (1 - 1/n)
  const numerator = sumSquares * scaleFactor - oneOverN;
  const denominator = oneMinusOneOverN;

  return scaleFactor - numerator / denominator;
};

export default concentration;
