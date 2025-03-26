import JSBI from "jsbi";
import {
  createPublicClient,
  Hex,
  http,
  isHex,
  parseAbi,
  PublicClient,
} from "viem";
import { anvil } from "viem/chains";
import { Vector } from "./types";

interface TickLiquidity {
  liquidityGross: JSBI; // uint128
  liquidityNet: JSBI; // int128
}

interface Tick {
  tickIdx: number; // int24
  liquidityGross: JSBI; // uint128
  liquidityNet: JSBI; // int128
}

// The multicall response would be an array of these tuples
type MultiCallResponse = TickLiquidity[];

class LiquidityCurve {
  stateViewAddress: Hex;
  client: PublicClient;
  abi: any;

  MIN_TICK = -887272;
  MAX_TICK = 887272;

  constructor(stateViewAddress: string) {
    if (!isHex(stateViewAddress)) {
      throw new Error("Invalid state view address");
    }

    this.stateViewAddress = stateViewAddress;
    this.client = createPublicClient({
      chain: anvil,
      transport: http(),
    });
    this.abi = parseAbi([
      "function getTickLiquidity(byte32 poolId, int24 tick) external view returns (uint128 liquidityGross, int128 liquidityNet)",
      "function getLiquidity(byte32 poolId) external view returns (uint128 liquidity)",
    ]);
  }

  private async getPoolLiquidity(poolAddress: Hex): Promise<JSBI> {
    return (await this.client.readContract({
      address: this.stateViewAddress,
      abi: this.abi,
      functionName: "getLiquidity",
      args: [poolAddress],
    })) as unknown as JSBI;
  }

  async get(
    poolAddress: Hex,
    currentTick: number,
    tickSpacing: number
  ): Promise<Vector<number>> {
    const ticks = Array.from(
      { length: Math.trunc((this.MAX_TICK - this.MIN_TICK) / tickSpacing + 1) },
      (_, i) => this.MIN_TICK + i * tickSpacing
    );

    const [res, poolLiquidity] = await Promise.all([
      this.client.multicall({
        allowFailure: false,
        contracts: ticks.map((tick) => ({
          address: this.stateViewAddress,
          abi: this.abi,
          functionName: "getTickLiquidity",
          args: [poolAddress, tick],
        })),
      }) as unknown as MultiCallResponse,
      this.getPoolLiquidity(poolAddress),
    ]);

    return this.compute(
      currentTick,
      tickSpacing,
      res.map((tick, i) => ({
        tickIdx: this.MIN_TICK + i * tickSpacing,
        liquidityGross: tick.liquidityGross,
        liquidityNet: tick.liquidityNet,
      })),
      poolLiquidity
    );
  }

  compute(
    currentTick: number,
    tickSpacing: number,
    ticks: Tick[],
    liquidity: JSBI
  ): Vector<number> {
    const dist: Vector<number> = [[currentTick, Number(liquidity)]];
    let prevLiq = liquidity;

    const currentTickIdx = Math.trunc(this.MAX_TICK / tickSpacing);
    for (let i = currentTickIdx + 1; i < ticks.length; i++) {
      const tick = ticks[i];
      const liquidity = JSBI.add(prevLiq, tick.liquidityNet);

      dist.push([tick.tickIdx, Number(liquidity)]);
      prevLiq = liquidity;
    }

    prevLiq = liquidity;
    for (let i = currentTickIdx - 1; i >= 0; i--) {
      const tick = ticks[i];
      const liquidity = JSBI.add(prevLiq, tick.liquidityNet);

      dist.unshift([tick.tickIdx, Number(liquidity)]);
      prevLiq = liquidity;
    }

    return dist;
  }
}

export default LiquidityCurve;
