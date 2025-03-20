import { VolatilityWeights, VolatilityScores } from "../types";

const DEFAULT_WEIGHTS: Required<VolatilityWeights> = {
  overall: 0.3,
  transition: 0.25,
  perTick: 0.2,
  entropy: 0.15,
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

  // Normalize components to [0,1] range
  const minVal = Math.min(...components);
  const maxVal = Math.max(...components);
  const normalized = components.map(
    (val) => (val - minVal) / (maxVal - minVal + 1e-9)
  );

  // Get weights with defaults
  const finalWeights = [
    weights.overall,
    weights.transition,
    weights.perTick,
    weights.entropy,
    weights.temporal,
  ];

  // Calculate weighted sum
  return Number(
    normalized
      .reduce((sum, comp, i) => sum + comp * finalWeights[i], 0)
      .toFixed(2)
  );
};

export default aggregateVolatility;
