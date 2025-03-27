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
import { MAX_TICK, MIN_TICK } from "./utils";

interface TickLiquidity {
  liquidityGross: bigint; // uint128
  liquidityNet: bigint; // int128
}

interface Tick {
  tickIdx: number; // int24
  liquidityGross: bigint; // uint128
  liquidityNet: bigint; // int128
}

// The multicall response would be an array of these tuples
type MultiCallResponse = TickLiquidity[];

class LiquidityCurve {
  stateViewAddress: Hex;
  client: PublicClient;
  abi: any;

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
      "function getTickLiquidity(bytes32 poolId, int24 tick) external view returns (uint128 liquidityGross, int128 liquidityNet)",
      "function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity)",
    ]);
  }

  private async getPoolLiquidity(poolAddress: Hex): Promise<bigint> {
    return (await this.client.readContract({
      address: this.stateViewAddress,
      abi: this.abi,
      functionName: "getLiquidity",
      args: [poolAddress],
    })) as bigint;
  }

  async get(
    poolAddress: Hex,
    currentTick: number,
    tickSpacing: number
  ): Promise<Vector<number>> {
    const tickSpacingB = BigInt(tickSpacing);

    const ticks = Array.from(
      // Convert bigints to numbers for this calculation
      {
        length: Math.trunc(
          (Number(MAX_TICK) - Number(MIN_TICK)) / Number(tickSpacingB) + 1
        ),
      },
      (_, i) => Number(MIN_TICK) + i * Number(tickSpacingB) // Convert MIN_TICK to number
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

    const poolLiquidityBigInt = BigInt(poolLiquidity);

    return this.compute(
      currentTick,
      tickSpacing,
      res.map((tick, i) => ({
        // Convert MIN_TICK to number for calculation
        tickIdx: Number(MIN_TICK) + i * tickSpacing,
        liquidityGross: tick.liquidityGross,
        liquidityNet: tick.liquidityNet,
      })),
      poolLiquidityBigInt
    );
  }

  private compute(
    currentTick: number,
    tickSpacing: number,
    ticks: Tick[],
    liquidity: bigint
  ): Vector<number> {
    const dist: Vector<number> = [[BigInt(currentTick), liquidity]];
    let prevLiq = liquidity;

    // Convert MAX_TICK to number for division
    const currentTickIdx = Math.trunc(Number(MAX_TICK) / tickSpacing);
    for (let i = currentTickIdx + 1; i < ticks.length; i++) {
      const tick = ticks[i];
      const currentLiquidity = prevLiq - tick.liquidityNet;
      dist.push([BigInt(tick.tickIdx), currentLiquidity]);
      prevLiq = currentLiquidity;
    }

    prevLiq = liquidity;
    for (let i = currentTickIdx - 1; i >= 0; i--) {
      const tick = ticks[i];
      const currentLiquidity = prevLiq - tick.liquidityNet;
      dist.unshift([BigInt(tick.tickIdx), currentLiquidity]);
      prevLiq = currentLiquidity;
    }

    return dist;
  }
}

export default LiquidityCurve;
