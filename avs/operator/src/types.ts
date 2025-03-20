export type Curve = [number, number][];

export type Vector<L extends number> = { length: L } & [...[number, number][]];
export type VectorPair<L extends number> = [Vector<L>, Vector<L>];

// Base compute function type
export type ComputeFunction = (window: number[]) => number;

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
