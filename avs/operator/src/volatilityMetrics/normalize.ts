import { log10, max } from "extra-bigint";
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
  const lambdaScaled = 9000n; // 0.9 * SCALE_FACTOR
  const oneMinusLambdaScaled = SCALE_FACTOR - lambdaScaled;

  // Calculate new moving average
  const weightedPrev = (lambdaScaled * ma) / SCALE_FACTOR;
  const weightedCurr = (oneMinusLambdaScaled * curr) / SCALE_FACTOR;
  const calculated = weightedPrev + weightedCurr;

  return [curr, calculated];
};

export default ewmx;
