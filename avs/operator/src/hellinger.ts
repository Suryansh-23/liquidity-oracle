import { VectorPair } from "./types";
import { sumNormalize } from "./utils";

const hellingerDistance = (vp: VectorPair<number>): number => {
  let [p, q] = vp;
  p = sumNormalize(p);
  q = sumNormalize(q);

  return Math.sqrt(
    p.reduce((acc, [_, x], i) => {
      const diff = Math.sqrt(x) - Math.sqrt(q[i][1]);
      return acc + diff * diff;
    }, 0) / 2
  );
};

export default hellingerDistance;
