import { toPrecision } from "../utils";

const LAMBDA = 0.9;

const ewmx = (curr: number, ma: number): [number, number] => {
  const newMA = Math.max(curr, LAMBDA * ma + (1 - LAMBDA) * curr);
  const score = Math.log(1 + curr) / Math.log(1 + newMA);

  return [toPrecision(score), newMA];
};

export default ewmx;
