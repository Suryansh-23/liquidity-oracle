import { VectorPair } from "../types";

/**
 * Calculate the Wasserstein distance between two one-dimensional distributions.
 *
 * This function computes the Wasserstein distance between two empirical
 * distributions represented as curves. The Wasserstein distance is a measure
 * of the distance between two probability distributions over a given metric space.
 *
 * @param vp - A pair of vectors representing the two empirical distributions.
 * @returns The computed Wasserstein distance between the distributions.
 */
const wassersteinDistance = (vp: VectorPair<number>): number => {
  let [p, q] = vp;

  return cdfDistance(
    p.map(([, liq]) => liq),
    q.map(([, liq]) => liq)
  );
};

/**
 * Compute the Wasserstein distance between two one-dimensional distributions.
 *
 * This function calculates the statistical distance between two distributions
 * whose respective CDFs are U and V, defined as:
 *
 * l_p(u, v) = (∫_{-∞}^{+∞} |U-V|^p)^(1/p)
 *  
 * For our case, p is fixed at 1, which gives the Wasserstein distance.
 *
 * @param u_values - Values observed in the first empirical distribution.
 * @param v_values - Values observed in the second empirical distribution.
 * @returns The computed Wasserstein distance between the distributions.
 */
function cdfDistance(u_values: number[], v_values: number[]): number {
  // Validate and prepare the distributions
  // We're skipping weight validation as we're assuming no weights

  // Sort the values
  const u_sorter = argsort(u_values);
  const v_sorter = argsort(v_values);

  // Concatenate all values and sort them
  const all_values = [...u_values, ...v_values].sort((a, b) => a - b);

  // Compute the differences between pairs of successive values
  const deltas = diff(all_values);

  // Get the respective positions of the values of u and v among the values of
  // both distributions
  const u_cdf_indices = searchsortedRight(
    u_values.slice().sort((a, b) => a - b),
    all_values.slice(0, -1)
  );
  const v_cdf_indices = searchsortedRight(
    v_values.slice().sort((a, b) => a - b),
    all_values.slice(0, -1)
  );

  // Calculate the CDFs of u and v (without weights)
  const u_cdf = u_cdf_indices.map((index) => index / u_values.length);
  const v_cdf = v_cdf_indices.map((index) => index / v_values.length);

  // Compute the value of the integral based on the CDFs for p = 1
  return deltas.reduce(
    (sum, delta, i) => sum + Math.abs(u_cdf[i] - v_cdf[i]) * delta,
    0
  );
}

/**
 * Returns the indices that would sort an array.
 *
 * @param array - The input array to be sorted.
 * @returns An array of indices that would sort the input array.
 */
function argsort(array: number[]): number[] {
  return array
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value)
    .map((item) => item.index);
}

/**
 * Calculate the differences between consecutive elements in an array.
 *
 * @param array - The input array.
 * @returns An array of differences between consecutive elements.
 */
function diff(array: number[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < array.length; i++) {
    result.push(array[i] - array[i - 1]);
  }
  return result;
}

/**
 * Find indices where elements should be inserted to maintain order.
 * Similar to numpy's searchsorted with 'right' side.
 *
 * @param sortedArray - A sorted array.
 * @param values - Values to insert into the array.
 * @returns An array of indices where each value would be inserted.
 */
function searchsortedRight(sortedArray: number[], values: number[]): number[] {
  return values.map((value) => {
    let low = 0;
    let high = sortedArray.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (value < sortedArray[mid]) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    return low;
  });
}

export default wassersteinDistance;
