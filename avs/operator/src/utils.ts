import { Curve, PRECISION, Vector, VectorPair } from "./types";

export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

export const MAX_WINDOW_SIZE = 5;

export const distributionToCurve = (
  distribution: bigint[],
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
      curve.push([BigInt(i), distribution[index]]);
    } else {
      curve.push([BigInt(i), 0n]);
    }
  }

  return curve;
};

export const curveToVectorPair = (c1: Curve, c2: Curve): VectorPair<number> => {
  if (c1.length !== c2.length) {
    throw new Error("Curves must have the same length");
  }

  const l = c1.length;
  const delta = Number(c1[1][0] - c1[0][0]);

  if (Number(c1[0][0]) < Number(c2[0][0])) {
    for (let i = Number(c1[0][0]); i < Number(c2[0][0]); i += delta) {
      c2.unshift([BigInt(i), 0n]);
    }

    for (
      let i = Number(c1[l - 1][0]) + delta;
      i <= Number(c2[l - 1][0]);
      i += delta
    ) {
      c1.push([BigInt(i), 0n]);
    }
  } else if (Number(c2[0][0]) < Number(c1[0][0])) {
    for (let i = Number(c2[0][0]); i < Number(c1[0][0]); i += delta) {
      c1.unshift([BigInt(i), 0n]);
    }

    for (
      let i = Number(c2[l - 1][0]) + delta;
      i <= Number(c1[l - 1][0]);
      i += delta
    ) {
      c2.push([BigInt(i), 0n]);
    }
  }

  return [c1 as Vector<number>, c2 as Vector<number>];
};

export const sumNormalize = (
  v: Vector<number>,
  sum?: bigint
): Vector<number> => {
  if (sum === undefined) {
    sum = v.reduce((acc, [_, x]) => acc + x, 0n);
  }

  const scaleFactor = 10000n; // For precision (4 decimal places)
  return v.map(([x, y]) => [x, (y * scaleFactor) / sum]);
};

export const toPrecision = (n: bigint): bigint => {
  // For bigint, we assume the value is already scaled by 10^PRECISION
  // We don't need to truncate decimal places since bigint is already integer
  return n;
};
