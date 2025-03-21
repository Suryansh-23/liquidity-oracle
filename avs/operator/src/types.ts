export const PRECISION = 4;

export type Curve = [number, number][];

export type Vector<L extends number> = { length: L } & [...[number, number][]];
export type VectorPair<L extends number> = [Vector<L>, Vector<L>];

// Base compute function type - now accepts array of snapshots
export type ComputeFunction = (window: number[][]) => number;

// Configuration for each compute function
export interface ComputeConfig {
  id: string;
  compute: ComputeFunction;
  weight: number;
}

// Runner configuration type
export interface RunnerConfig {
  windowSize: number;
  computeConfigs: ComputeConfig[];
  aggregator: (
    scores: Map<string, number>,
    weights: Map<string, number>
  ) => number;
}

// Compute results type
export interface ComputeResults {
  individualScores: Map<string, number>;
  aggregatedScore: number;
}

// Volatility-specific types
export interface VolatilitySnapshot {
  liquidity: Vector<number>;
  transition?: number;
}

export interface VolatilityScores {
  overall: number;
  transition: number;
  perTick: number;
  entropy: number;
  temporal: number;
}

export interface AggregateHistory {
  rsdEMX: number;
  rvEMX: number;
  rangeEMX: number;
  transitionEMX: number;
  perTickEMX: number;
}

export interface VolatilityWeights {
  overall: number;
  transition: number;
  perTick: number;
  entropy: number;
  temporal: number;
}

export interface VolatilityResult {
  overall: number;
  transition: number;
  perTick: number;
  entropy: number;
  temporal: number;
  aggregate: number;
}
