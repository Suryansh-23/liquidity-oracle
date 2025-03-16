export type Curve = [number, number][];

export type Vector<L extends number> = { length: L } & [...[number, number][]];
export type VectorPair<L extends number> = [Vector<L>, Vector<L>];
