import { VectorPair } from "./types";

// @ts-ignore
import hungarian from "hungarian-on3";

const wassersteinDistance = (vp: VectorPair<number>, m = 1): number => {
  let [p, q] = vp;
  const massP = p.reduce((acc, [_, liq]) => acc + liq, 0);
  const massQ = q.reduce((acc, [_, liq]) => acc + liq, 0);

  const comP =
    p.reduce((acc, [tick, liq]) => {
      return acc + tick * liq;
    }, 0) / massP;
  const comQ =
    q.reduce((acc, [tick, liq]) => {
      return acc + tick * liq;
    }, 0) / massQ;

  const delta = p[1][0] - p[0][0];

  if (massP < massQ) {
    const diffMass = massQ - massP;
    const dummyTick = comP < comQ ? p[0][0] : p[p.length - 1][0];

    p.unshift([dummyTick - delta, diffMass]);
    q.unshift([dummyTick - delta, 0]);
  } else if (massP > massQ) {
    const diffMass = massP - massQ;
    const dummyTick = comP < comQ ? q[0][0] : q[q.length - 1][0];

    q.unshift([dummyTick - delta, diffMass]);
    p.unshift([dummyTick - delta, 0]);
  }

  const l = p.length;
  const mat = new Array(l).fill(0).map(() => new Array(l).fill(0));

  mat.forEach((row, i) => {
    row.forEach((_, j) => {
      mat[i][j] = Math.pow(Math.abs(p[i][0] - q[j][0]), 1 / m);
    });
  });

  const assignment = hungarian(mat) as [number, number][];
  const totalCost = assignment.reduce((acc, [i, j]) => {
    return acc + mat[i][j];
  }, 0);

  return Math.pow(totalCost, 1 / m);
};

export default wassersteinDistance;
