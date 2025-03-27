import {
  AggregateHistory,
  VolatilityScores,
  VolatilityWeights,
} from "../types";
import { toPrecision } from "../utils";

const SCALE_FACTOR = 10000n; // For 4 decimal places precision

const DEFAULT_WEIGHTS: Required<VolatilityWeights> = {
  overall: 3500n, // 0.35 * SCALE_FACTOR
  transition: 2500n, // 0.25 * SCALE_FACTOR
  perTick: 2000n, // 0.20 * SCALE_FACTOR
  entropy: 1000n, // 0.10 * SCALE_FACTOR
  temporal: 1000n, // 0.10 * SCALE_FACTOR
};

/**
 * Aggregates individual volatility components into a composite score
 */
const aggregateVolatility = (
  scores: VolatilityScores,
  weights: VolatilityWeights = DEFAULT_WEIGHTS
): bigint => {
  // Convert scores to array for normalization
  const components = [
    scores.overall,
    scores.transition,
    scores.perTick,
    scores.entropy,
    scores.temporal,
  ];

  // Get weights with defaults
  const finalWeights = [
    weights.overall || DEFAULT_WEIGHTS.overall,
    weights.transition || DEFAULT_WEIGHTS.transition,
    weights.perTick || DEFAULT_WEIGHTS.perTick,
    weights.entropy || DEFAULT_WEIGHTS.entropy,
    weights.temporal || DEFAULT_WEIGHTS.temporal,
  ];

  // Calculate weighted sum
  const weightedSum = components.reduce(
    (sum, comp, i) => sum + (comp * finalWeights[i]) / SCALE_FACTOR,
    0n
  );

  return toPrecision(weightedSum);
};

export default aggregateVolatility;
