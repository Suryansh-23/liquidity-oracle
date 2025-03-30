import { sqrt } from "extra-bigint";
import { VectorPair } from "../types";
import { sumNormalize } from "../utils";
import { SCALE_FACTOR } from "../constants";

const hellingerDistance = (vp: VectorPair<number>): bigint => {
  let [p, q] = vp;

  // Normalize vectors
  p = sumNormalize(p);
  q = sumNormalize(q);

  // Calculate Hellinger distance with bigint
  const sumSquaredDiff = p.reduce((acc, [_, x], i) => {
    // Calculate square roots using our bigint sqrt function
    const sqrtX = sqrt(x * SCALE_FACTOR);
    const sqrtY = sqrt(q[i][1] * SCALE_FACTOR);

    // Calculate difference and square it
    const diff = sqrtX > sqrtY ? sqrtX - sqrtY : sqrtY - sqrtX;
    return acc + diff * diff * 10n;
  }, 0n);
  console.log(`Sum of squared differences: ${sumSquaredDiff}`);

  // Divide by 2 and take square root
  return sqrt(sumSquaredDiff / 2n);
};

export default hellingerDistance;
