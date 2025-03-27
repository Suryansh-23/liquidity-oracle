import { toPrecision } from "../utils";

const LAMBDA = 0.9;
const SCALE_FACTOR = 10000n; // Scale factor for 4 decimal places precision

/**
 * Calculate exponential weighted moving average with bigint arithmetic
 * @param curr Current value as bigint
 * @param ma Previous moving average as bigint
 * @returns Normalized value and updated moving average as bigints
 */
const ewmx = (curr: bigint, ma: bigint): [bigint, bigint] => {
  // Convert LAMBDA to scaled bigint
  const lambdaScaled = BigInt(Math.floor(LAMBDA * Number(SCALE_FACTOR)));
  const oneMinusLambdaScaled = SCALE_FACTOR - lambdaScaled;

  // Calculate new moving average
  const weightedPrev = (lambdaScaled * ma) / SCALE_FACTOR;
  const weightedCurr = (oneMinusLambdaScaled * curr) / SCALE_FACTOR;
  const calculated = weightedPrev + weightedCurr;

  // Take max of current and calculated MA
  const newMA = curr > calculated ? curr : calculated;

  // Calculate logarithmic score
  // For bigint, we use a scaled approximation of log(1 + x) / log(1 + y)
  let score: bigint;

  if (newMA === 0n) {
    score = curr === 0n ? SCALE_FACTOR : 0n; // Handle division by zero case
  } else {
    // Use approximation: log(1+x)/log(1+y) ≈ x/y for small values
    // For larger values, we need to convert to floating point
    const currFloat = Number(curr) / Number(SCALE_FACTOR);
    const newMAFloat = Number(newMA) / Number(SCALE_FACTOR);

    const scoreFloat = Math.log(1 + currFloat) / Math.log(1 + newMAFloat);
    score = BigInt(Math.floor(scoreFloat * Number(SCALE_FACTOR)));
  }

  return [toPrecision(score), newMA];
};

export default ewmx;
