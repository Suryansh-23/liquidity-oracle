import { Curve, Vector, VectorPair } from "./types";

export const distributionToCurve = (
  distribution: number[],
  start: number,
  end: number,
  tickSpacing: number
): Curve => {
  if (distribution.length !== Math.floor((end - start) / tickSpacing) + 1) {
    throw new Error(
      `Distribution length ${
        distribution.length
      } does not match expected length ${
        Math.floor((end - start) / tickSpacing) + 1
      }`
    );
  }

  const curve: Curve = [];

  for (let i = start; i <= end; i += tickSpacing) {
    const index = Math.floor((i - start) / tickSpacing);
    if (index < distribution.length) {
      curve.push([i, distribution[index]]);
    } else {
      curve.push([i, 0]);
    }
  }

  return curve;
};

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
