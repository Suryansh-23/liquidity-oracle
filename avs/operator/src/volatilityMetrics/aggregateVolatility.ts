import {
  AggregateHistory,
  VolatilityScores,
  VolatilityWeights,
} from "../types";
import { toPrecision } from "../utils";

const DEFAULT_WEIGHTS: Required<VolatilityWeights> = {
  overall: 0.35,
  transition: 0.25,
  perTick: 0.2,
  entropy: 0.1,
  temporal: 0.1,
};

/**
 * Aggregates individual volatility components into a composite score
 */
const aggregateVolatility = (
  scores: VolatilityScores,
  weights: VolatilityWeights = DEFAULT_WEIGHTS
): number => {
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
    weights.overall,
    weights.transition,
    weights.perTick,
    weights.entropy,
    weights.temporal,
  ];

  // Calculate weighted sum
  return toPrecision(
    components.reduce((sum, comp, i) => sum + comp * finalWeights[i], 0)
  );
};

export default aggregateVolatility;
