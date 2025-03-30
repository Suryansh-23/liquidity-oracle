import { Vector, VectorPair } from "../types";
import { sqrt } from "extra-bigint";

const SCALE_FACTOR = 10000n; // For 4 decimal places precision

const cosineMag = <L extends number>(v: Vector<L>): bigint => {
  const sum = v.reduce((acc, [_, x]) => acc + x * x, 0n);
  return sqrt(sum);
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

  console.log(
    `Dot Product: ${dot_product}, Magnitude A: ${magnitude_a}, Magnitude B: ${magnitude_b}`
  );

  // Scale the dot product before division to maintain precision
  const scaled_dot_product = dot_product * SCALE_FACTOR;
  let result = scaled_dot_product / magnitude_product;

  // Ensure result is within -1 to 1 range (scaled)
  if (result > SCALE_FACTOR) {
    result = SCALE_FACTOR;
  }

  return result;
};

export default cosine;
