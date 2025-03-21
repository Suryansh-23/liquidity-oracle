import { Vector } from "../types";

const EDGE_WEIGHT = 0.1;

const expoDecay = (x: number, k: number) => {
  const lambda = -Math.log(EDGE_WEIGHT) / k;

  return Math.exp(-lambda * x);
};

const depth = (
  dist: Vector<number>,
  currentTick: number,
  snapshotSize: number
): number => {
  const distWithDistance = dist.map((point) => [
    Math.abs(point[0] - currentTick),
    point[1],
  ]);

  return distWithDistance.reduce((sum, point) => {
    return sum + expoDecay(point[0], snapshotSize) * point[1];
  }, 0);
};

export default depth;
