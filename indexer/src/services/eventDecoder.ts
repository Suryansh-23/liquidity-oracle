import {
  Abi,
  decodeEventLog,
  Hex,
  keccak256,
  parseAbi,
  toEventSignature,
  toHex,
} from "viem";
import { EVENT_SIGNATURES } from "../constant";
import { ModifyLiquidityEvent, SwapEvent } from "../types";
import { EventDecodingError } from "../utils/errors";
import { Logger } from "../utils/logger";

type DecodedEvent = {
  eventName: "Swap" | "ModifyLiquidity";
  decoded: any;
};

export class EventDecoder {
  private topic0ToAbi: Map<string, Abi>;

  constructor() {
    this.topic0ToAbi = new Map();
    this.initializeEventSignatures();
  }

  private initializeEventSignatures(): void {
    EVENT_SIGNATURES.forEach((sig) => {
      try {
        const topic0 = keccak256(toHex(toEventSignature(sig)));
        const abi = parseAbi([sig]);
        this.topic0ToAbi.set(topic0, abi);
      } catch (error) {
        throw new EventDecodingError(
          `Failed to initialize event signature: ${sig}`,
          error
        );
      }
    });
  }

  public getTopic0List(): string[] {
    return Array.from(this.topic0ToAbi.keys());
  }

  public decodeEvent(
    topics: string[],
    data: string,
    log: { transactionHash?: string }
  ): { eventName: "Swap" | "ModifyLiquidity"; decoded: any } | null {
    const topic0 = topics[0];
    if (!topic0 || !this.topic0ToAbi.has(topic0)) {
      Logger.warn(`Unsupported topic0: ${topic0}`);
      return null;
    }

    const abi = this.topic0ToAbi.get(topic0)!;

    try {
      const result = decodeEventLog({
        abi,
        topics: topics.filter(Boolean) as [`0x${string}`, ...`0x${string}`[]],
        data: data as Hex,
      });

      if (!result.eventName || !result.args) {
        throw new EventDecodingError(
          "Missing eventName or args in decoded result"
        );
      }

      return {
        eventName: result.eventName as "Swap" | "ModifyLiquidity",
        decoded: {
          ...result.args,
          transactionHash: log.transactionHash || "",
        },
      };
    } catch (error) {
      Logger.error("Failed to decode event", error);
      return null;
    }
  }

  public parseModifyLiquidityEvent(decoded: any): ModifyLiquidityEvent {
    try {
      return {
        id: decoded.id,
        transactionHash: decoded.transactionHash,
        sender: decoded.sender,
        tickLower: BigInt(decoded.tickLower.toString()),
        tickUpper: BigInt(decoded.tickUpper.toString()),
        liquidityDelta: decoded.liquidityDelta.toString(),
      };
    } catch (error) {
      throw new EventDecodingError("Failed to parse ModifyLiquidity event", {
        decoded,
        error,
      });
    }
  }

  public parseSwapEvent(decoded: any): SwapEvent {
    try {
      return {
        id: decoded.id,
        transactionHash: decoded.transactionHash,
        sender: decoded.sender,
        amount0: decoded.amount0.toString(),
        amount1: decoded.amount1.toString(),
        sqrtPriceX96: decoded.sqrtPriceX96.toString(),
        liquidity: decoded.liquidity.toString(),
        tick: BigInt(decoded.tick.toString()),
        fee: BigInt(decoded.fee.toString()),
      };
    } catch (error) {
      throw new EventDecodingError("Failed to parse Swap event", {
        decoded,
        error,
      });
    }
  }
}
