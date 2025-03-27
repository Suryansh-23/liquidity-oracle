import { Vector, VectorPair } from "../types";

const SCALE_FACTOR = 10000n; // For 4 decimal places precision

const cosineMag = <L extends number>(v: Vector<L>): bigint => {
  const sum = v.reduce((acc, [_, x]) => acc + x * x, 0n);
  return bigintSqrt(sum);
};

const cosine = (vp: VectorPair<number>): bigint => {
  const [a, b] = vp;

  // Calculate dot product
  const dot_product = a.reduce((acc, [_, x], i) => acc + x * b[i][1], 0n);

  // Calculate magnitudes
  const magnitude_a = cosineMag(a);
  const magnitude_b = cosineMag(b);
  const magnitude_product = magnitude_a * magnitude_b;

  // Handle division by zero case
  if (magnitude_product === 0n) {
    return 0n;
  }

  // Scale the dot product before division to maintain precision
  const scaled_dot_product = dot_product * SCALE_FACTOR;
  let result = scaled_dot_product / magnitude_product;

  // Ensure result is within -1 to 1 range (scaled)
  if (result < -SCALE_FACTOR) {
    result = -SCALE_FACTOR;
  } else if (result > SCALE_FACTOR) {
    result = SCALE_FACTOR;
  }

  return result;
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

export default cosine;
