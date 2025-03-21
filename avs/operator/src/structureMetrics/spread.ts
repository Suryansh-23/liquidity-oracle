import { Vector } from "../types";
import { sumNormalize } from "../utils";

/**
 * Calculates the Liquidity Spread of the Liquidity Distribution
 * @param dist Vector representing liquidity distribution
 * @param currentTick Current tick position
 * @returns Standard deviation of the distribution
 */
const spread = (dist: Vector<number>, currentTick: number): number => {
  const weightsAndDistance = sumNormalize(dist).map((point) => [
    Math.abs(point[0] - currentTick),
    point[1],
  ]);

  const mu = weightsAndDistance.reduce(
    (sum, point) => sum + point[0] * point[1],
    0
  );

  return Math.sqrt(
    weightsAndDistance.reduce(
      (sum, point) => sum + Math.pow(point[0] - mu, 2) * point[1],
      0
    )
  );
};

export default spread;
