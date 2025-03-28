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
import { MIN_TICK } from "./utils";

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

const K = 1_100;

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
    console.log(typeof currentTick, currentTick);
    console.log(typeof tickSpacing, tickSpacing);
    console.log(typeof K, K);

    const ticks = Array.from(
      {
        length: Math.trunc(2 * K + 1),
      },
      (_, i) => currentTick + (i - K) * tickSpacing
    );

    const contractCalls = ticks.map(
      async (tick: number) =>
        await this.client.readContract({
          address: this.stateViewAddress,
          abi: this.abi,
          functionName: "getTickLiquidity",
          args: [poolAddress, BigInt(tick)],
        })
    );

    const [tickResults, poolLiquidity] = await Promise.all([
      Promise.all(contractCalls),
      this.getPoolLiquidity(poolAddress),
    ]);
    console.log("tickResults:", tickResults);

    const res = tickResults as MultiCallResponse;
    console.log("res: ", res);

    const poolLiquidityBigInt = BigInt(poolLiquidity);
    console.log("pool Liquidity: ", poolLiquidity, poolLiquidityBigInt);

    // res.forEach((tick, i) => {
    //   if (
    //     tick.liquidityGross === undefined ||
    //     tick.liquidityNet === undefined
    //   ) {
    //     console.error(
    //       `Error: Missing liquidity data for tick ${ticks[i]} at index ${i}`
    //     );
    //   }
    // });

    return this.compute(
      currentTick,
      res.map((tick, i) => ({
        // Convert MIN_TICK to number for calculation
        tickIdx: Number(MIN_TICK) + i * tickSpacing,
        liquidityGross: BigInt(
          tick.liquidityGross === undefined ? 0 : tick.liquidityGross
        ),
        liquidityNet: BigInt(
          tick.liquidityNet === undefined ? 0 : tick.liquidityNet
        ),
      })),
      poolLiquidityBigInt
    );
  }

  private compute(
    currentTick: number,
    ticks: Tick[],
    liquidity: bigint
  ): Vector<number> {
    const dist: Vector<number> = [[BigInt(currentTick), liquidity]];
    let prevLiq = liquidity;

    for (let i = K + 2; i < ticks.length; i++) {
      const tick = ticks[i];
      const currentLiquidity = prevLiq - tick.liquidityNet;
      dist.push([BigInt(tick.tickIdx), currentLiquidity]);
      prevLiq = currentLiquidity;
    }

    prevLiq = liquidity;
    for (let i = K; i >= 0; i--) {
      const tick = ticks[i];
      const currentLiquidity = prevLiq - tick.liquidityNet;
      dist.unshift([BigInt(tick.tickIdx), currentLiquidity]);
      prevLiq = currentLiquidity;
    }

    return dist;
  }
}

export default LiquidityCurve;
