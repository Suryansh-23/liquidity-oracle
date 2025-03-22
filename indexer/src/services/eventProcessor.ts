import { Event } from "@envio-dev/hypersync-client";
import { DatabaseManager } from "../database/db";
import { EventDecoder } from "./eventDecoder";
import { Logger } from "../utils/logger";
import { EventCounts, ModifyLiquidityEvent, SwapEvent } from "../types";

type EventBatch = {
  modifyLiquidity: {
    event: ModifyLiquidityEvent;
    timestamp: number;
    blockNumber: number;
  }[];
  swap: { event: SwapEvent; timestamp: number; blockNumber: number }[];
};

export class EventProcessor {
  private eventDecoder: EventDecoder;
  private dbManager: DatabaseManager;
  private swapEventCount = 0;
  private modifyLiquidityEventCount = 0;
  private readonly batchSize: number;

  constructor(dbManager: DatabaseManager, batchSize = 100) {
    this.eventDecoder = new EventDecoder();
    this.dbManager = dbManager;
    this.batchSize = batchSize;
  }

  public getTopic0List(): string[] {
    return this.eventDecoder.getTopic0List();
  }

  public processEvents(events: Event[]): void {
    let currentBatch: EventBatch = {
      modifyLiquidity: [],
      swap: [],
    };

    for (const event of events) {
      const { topics, data, transactionHash } = event.log;
      const timestamp = event.block?.timestamp ?? Math.floor(Date.now() / 1000);
      const blockNumber = event.log.blockNumber ?? 0;

      if (!topics?.[0] || !data || !transactionHash) {
        Logger.warn("Skipping event with missing data");
        continue;
      }

      // Filter out and only process valid topics
      const validTopics = topics.filter(
        (topic): topic is string => typeof topic === "string" && topic !== null
      );

      if (validTopics.length === 0) {
        Logger.warn("Skipping event with no valid topics");
        continue;
      }

      try {
        const decodedEvent = this.eventDecoder.decodeEvent(validTopics, data, {
          transactionHash,
        });
        if (!decodedEvent) continue;

        const { eventName, decoded } = decodedEvent;

        switch (eventName) {
          case "Swap": {
            const swapEvent = this.eventDecoder.parseSwapEvent(decoded);
            currentBatch.swap.push({
              event: swapEvent,
              timestamp,
              blockNumber,
            });
            this.swapEventCount++;
            break;
          }
          case "ModifyLiquidity": {
            const modifyLiquidityEvent =
              this.eventDecoder.parseModifyLiquidityEvent(decoded);
            currentBatch.modifyLiquidity.push({
              event: modifyLiquidityEvent,
              timestamp,
              blockNumber,
            });
            this.modifyLiquidityEventCount++;
            break;
          }
        }

        // Process batch if it reaches the size limit
        if (this.getBatchSize(currentBatch) >= this.batchSize) {
          this.processBatch(currentBatch);
          currentBatch = { modifyLiquidity: [], swap: [] };
        }
      } catch (error) {
        Logger.error("Error processing event:", error);
      }
    }

    // Process any remaining events in the last batch
    if (this.getBatchSize(currentBatch) > 0) {
      this.processBatch(currentBatch);
    }
  }

  private getBatchSize(batch: EventBatch): number {
    return batch.swap.length + batch.modifyLiquidity.length;
  }

  private processBatch(batch: EventBatch): void {
    try {
      this.dbManager.insertEventsInTransaction(batch);
    } catch (error) {
      Logger.error("Error processing batch:", error);
    }
  }

  public getEventCounts(): EventCounts {
    return {
      swapEventCount: this.swapEventCount,
      modifyLiquidityEventCount: this.modifyLiquidityEventCount,
      totalCount: this.swapEventCount + this.modifyLiquidityEventCount,
    };
  }

  public resetCounts(): void {
    this.swapEventCount = 0;
    this.modifyLiquidityEventCount = 0;
  }
}
