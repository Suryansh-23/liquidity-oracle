import { VectorPair } from "../types";
import { sumNormalize } from "../utils";

const SCALE_FACTOR = 10000n; // Scale factor for 4 decimal places

const hellingerDistance = (vp: VectorPair<number>): bigint => {
  let [p, q] = vp;

  // Normalize vectors
  p = sumNormalize(p);
  q = sumNormalize(q);

  // Calculate Hellinger distance with bigint
  const sumSquaredDiff = p.reduce((acc, [_, x], i) => {
    // Calculate square roots using our bigint sqrt function
    const sqrtX = bigintSqrt(x * SCALE_FACTOR);
    const sqrtY = bigintSqrt(q[i][1] * SCALE_FACTOR);

    // Calculate difference and square it
    const diff = sqrtX > sqrtY ? sqrtX - sqrtY : sqrtY - sqrtX;
    return acc + (diff * diff) / SCALE_FACTOR;
  }, 0n);

  // Divide by 2 and take square root
  return bigintSqrt((sumSquaredDiff * SCALE_FACTOR) / 2n);
};

/**
 * Calculate bigint square root using binary search
 */
function bigintSqrt(value: bigint): bigint {
  if (value < 0n) {
    throw new Error("Square root of negative number is not supported");
  }

  if (value < 2n) {
    return value;
  }

  // Binary search for square root
  let lo = 0n;
  let hi = value;

  while (lo <= hi) {
    const mid = (lo + hi) / 2n;
    const midSquared = mid * mid;

    if (midSquared === value) {
      return mid;
    } else if (midSquared < value) {
      lo = mid + 1n;
    } else {
      hi = mid - 1n;
    }
  }

  return hi;
}

export default hellingerDistance;
