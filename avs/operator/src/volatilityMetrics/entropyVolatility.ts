import { standardDeviation } from "simple-statistics";
import { VolatilitySnapshot } from "../types";

/**
 * Entropy-Based Volatility Component: Standard deviation of snapshot entropies
 */
const entropyVolatility = (snapshots: VolatilitySnapshot[]): number => {
  return standardDeviation(
    snapshots.map((snapshot) =>
      getEntropy(snapshot.liquidity.map((point) => point[1]))
    )
  );
};

const getEntropy = (snapshot: number[]): number => {
  const total = snapshot.reduce((acc, val) => acc + val, 0);
  if (total === 0) return 0;
  const probs = snapshot.map((val) => val / total);
  return -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log(p) : 0), 0);
};

export default entropyVolatility;
