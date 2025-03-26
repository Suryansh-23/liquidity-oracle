import { Vector } from "../types";
import { MAX_TICK, MIN_TICK } from "../utils";

const EDGE_WEIGHT = 0.1;

const expoDecay = (x: number, k: number) => {
  const lambda = -Math.log(EDGE_WEIGHT) / k;

  return Math.exp(-lambda * x);
};

const depth = (
  dist: Vector<number>,
  currentTick: number,
  tickSpacing: number
): number => {
  const distWithDistance = dist.map((point) => [
    Math.abs(point[0] - currentTick),
    point[1],
  ]);

  const size = Math.trunc((MAX_TICK - MIN_TICK) / tickSpacing);

  return distWithDistance.reduce((sum, point) => {
    return sum + expoDecay(point[0], size) * point[1];
  }, 0);
};

export default depth;
