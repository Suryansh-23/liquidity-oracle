import { Curve, Vector, VectorPair } from "./types";

export const curveToVectorPair = (c1: Curve, c2: Curve): VectorPair<number> => {
  if (c1.length !== c2.length) {
    throw new Error("Curves must have the same length");
  }

  const l = c1.length;
  const delta = c1[1][0] - c1[0][0];

  if (c1[0][0] < c2[0][0]) {
    for (let i = c1[0][0]; i < c2[0][0]; i += delta) {
      c2.unshift([i, 0]);
    }

    for (let i = c1[l - 1][0] + delta; i <= c2[l - 1][0]; i += delta) {
      c1.push([i, 0]);
    }
  } else if (c2[0][0] < c1[0][0]) {
    for (let i = c1[0][0]; i < c2[0][0]; i += delta) {
      c1.unshift([i, 0]);
    }

    for (let i = c2[l - 1][0] + delta; i <= c1[l - 1][0]; i += delta) {
      c2.push([i, 0]);
    }
  }

  return [c1 as Vector<number>, c2 as Vector<number>];
};

export const sumNormalize = (
  v: Vector<number>,
  sum?: number
): Vector<number> => {
  if (sum === undefined) {
    sum = v.reduce((acc, [_, x]) => acc + x, 0);
  }

  return v.map(([x, y]) => [x, y / sum]);
};
