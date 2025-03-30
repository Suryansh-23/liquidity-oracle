export const PRECISION = 4;

export type Curve = [bigint, bigint][];

export type Vector<L extends number> = { length: L } & [...[bigint, bigint][]];
export type VectorPair<L extends number> = [Vector<L>, Vector<L>];

// Base compute function type - now accepts array of snapshots
export type ComputeFunction = (window: bigint[][]) => bigint;

// Configuration for each compute function
export interface ComputeConfig {
  id: string;
  compute: ComputeFunction;
  weight: bigint;
}

// Runner configuration type
export interface RunnerConfig {
  windowSize: number;
  computeConfigs: ComputeConfig[];
  aggregator: (
    scores: Map<string, bigint>,
    weights: Map<string, bigint>
  ) => bigint;
}

// Compute results type
export interface ComputeResults {
  individualScores: Map<string, bigint>;
  aggregatedScore: bigint;
}

// Volatility-specific types
export interface VolatilitySnapshot {
  liquidity: Vector<number>;
  transition: bigint;
}

export interface VolatilityScores {
  overall: bigint;
  transition: bigint;
  perTick: bigint;
  entropy: bigint;
  temporal: bigint;
}

export interface AggregateHistory {
  rsdEMX: bigint;
  rvEMX: bigint;
  rangeEMX: bigint;
  transitionEMX: bigint;
  perTickEMX: bigint;
}

export interface VolatilityWeights {
  overall: bigint;
  transition: bigint;
  perTick: bigint;
  entropy: bigint;
  temporal: bigint;
}

export interface VolatilityResult {
  overall: bigint;
  transition: bigint;
  perTick: bigint;
  entropy: bigint;
  temporal: bigint;
  aggregate: bigint;
}

export interface StructureMetricResults {
  liquidityConcentration: bigint;
  liquidityDepth: bigint;
  liquiditySpread: bigint;
}

export interface LiquidityMetricsResult {
  volatility: VolatilityResult;
  structure: StructureMetricResults;
  transition: bigint;
}
