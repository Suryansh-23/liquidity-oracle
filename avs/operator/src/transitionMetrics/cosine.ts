import { Vector, VectorPair } from "../types";

const cosineMag = <L extends number>(v: Vector<L>): number => {
  const sum = v.reduce((acc, [_, x]) => acc + x * x, 0);
  return Math.sqrt(sum);
};

const cosine = (vp: VectorPair<number>): number => {
  const [a, b] = vp;
  const dot_product = a.reduce((acc, [_, x], i) => acc + x * b[i][1], 0);
  const magnitude_product = cosineMag(a) * cosineMag(b);
  return magnitude_product !== 0
    ? Math.min(1, Math.max(-1, dot_product / magnitude_product))
    : 0;
};

export default cosine;
