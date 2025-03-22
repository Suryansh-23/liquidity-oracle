import {
  BlockField,
  Decoder,
  HypersyncClient,
  JoinMode,
  LogField,
  Query,
} from "@envio-dev/hypersync-client";
import { config } from "dotenv";
import path from "path";
import {
  Abi,
  decodeEventLog,
  Hex,
  keccak256,
  parseAbi,
  toEventSignature,
  toHex,
} from "viem";
import { EVENT_SIGNATURES } from "./constant";
import { DatabaseManager } from "./db";
import { ModifyLiquidityEvent, SwapEvent } from "./types";

// Load environment variables from .env file
config();

async function main() {
  console.info(`Starting indexer on ${process.env.NETWORK_NAME}...`);
  console.info(
    `Searching for events in ${process.env.POOL_MANAGER_ADDRESS}...`
  );

  // Initialize counters for events
  let swapEventCount = 0;
  let modifyLiquidityEventCount = 0;

  // Initialize database
  const dbPath = path.join(
    __dirname,
    `../data/${process.env.NETWORK_NAME || "event"}.db`
  );
  const dbManager = new DatabaseManager(dbPath);

  const client = HypersyncClient.new({
    url: `https://${process.env.NETWORK_NAME}.hypersync.xyz`,
    bearerToken: process.env.HYPERSYNC_BEARER_TOKEN,
  });

  // Create topic0 hashes from event signatures
  const topic0_list = EVENT_SIGNATURES.map((sig) =>
    keccak256(toHex(toEventSignature(sig)))
  );
  console.log("Topic0 list:", topic0_list);

  // a mapping for topic0 to event abi
  const topic0ToAbi = new Map<string, Abi>();
  EVENT_SIGNATURES.forEach((sig) => {
    const topic0 = keccak256(toHex(toEventSignature(sig)));
    const abi = parseAbi([sig]);
    topic0ToAbi.set(topic0, abi);
  });

  // Define the Hypersync query to get events we're interested in
  let query: Query = {
    fromBlock: 0,
    logs: [
      {
        address: [process.env.POOL_MANAGER_ADDRESS || ""],
        topics: [topic0_list],
      },
    ],
    fieldSelection: {
      log: [
        LogField.TransactionHash,
        LogField.Data,
        LogField.Address,
        LogField.Topic0,
        LogField.Topic1,
        LogField.Topic2,
        LogField.BlockNumber,
      ],
      block: [BlockField.Timestamp],
    },
    joinMode: JoinMode.JoinNothing,
  };

  try {
    const height = await client.getHeight();
    console.log(`Starting scan from block 0 to ${height}`);

    const decoder = Decoder.fromSignatures(EVENT_SIGNATURES);
    console.log("Decoder initialized");

    const stream = await client.streamEvents(query, {});
    console.log("Stream initialized");

    while (true) {
      const res = await stream.recv();
      if (!res) {
        console.log("✓ Reached tip of the chain");
        // Log the final event counts
        console.log("\nEvent Processing Summary:");
        console.log(`SwapEvents processed: ${swapEventCount}`);
        console.log(
          `ModifyLiquidityEvents processed: ${modifyLiquidityEventCount}`
        );

        // Print database statistics at the end
        dbManager.printDatabaseStats();
        break;
      }

      if (!res.nextBlock) {
        console.warn("Warning: Missing nextBlock in response");
        continue;
      }

      if (res.nextBlock % 1000 === 0) {
        // Also log current counts during processing
        console.log(`Processed up to block ${res.nextBlock}`);
        console.log(
          `Current SwapEvents: ${swapEventCount}, ModifyLiquidityEvents: ${modifyLiquidityEventCount}`
        );
        dbManager.printDatabaseStats();
      }

      res.data.forEach((event) => {
        const { topics, data } = event.log;

        const topic0 = topics[0];
        const timestamp =
          event.block?.timestamp || Math.floor(Date.now() / 1000);
        const blockNumber = event.log.blockNumber || 0;
        const txnHash = event.log.transactionHash || "";

        if (!topic0 || !data) {
          console.error("Invalid log data:", event.log);
          return;
        }

        if (topic0ToAbi.has(topic0)) {
          const abi = topic0ToAbi.get(topic0);
          if (!abi) {
            console.error("ABI not found for topic0:", topic0);
            return;
          }

          try {
            const { eventName, args: decoded } = decodeEventLog({
              abi,
              topics: topics as [`0x${string}`, ...`0x${string}`[]],
              data: (data as Hex) || "0x",
              //   strict: false,
            });

            if (!eventName || !decoded) {
              console.error("Failed to decode event");
              return;
            }

            switch (eventName) {
              case "Swap":
                const swapEvent: SwapEvent = {
                  id: (decoded as any).id,
                  sender: (decoded as any).sender,
                  amount0: (decoded as any).amount0.toString(),
                  amount1: (decoded as any).amount1.toString(),
                  sqrtPriceX96: (decoded as any).sqrtPriceX96.toString(),
                  liquidity: (decoded as any).liquidity.toString(),
                  tick: BigInt((decoded as any).tick.toString()),
                  fee: BigInt((decoded as any).fee.toString()),
                };
                dbManager.insertSwapEvent(
                  swapEvent,
                  txnHash,
                  timestamp,
                  blockNumber
                );
                swapEventCount++;
                break;
              case "ModifyLiquidity":
                const modifyLiquidityEvent: ModifyLiquidityEvent = {
                  id: (decoded as any).id,
                  sender: (decoded as any).sender,
                  tickLower: BigInt((decoded as any).tickLower.toString()),
                  tickUpper: BigInt((decoded as any).tickUpper.toString()),
                  liquidityDelta: (decoded as any).liquidityDelta.toString(),
                };
                dbManager.insertModifyLiquidityEvent(
                  modifyLiquidityEvent,
                  txnHash,
                  timestamp,
                  blockNumber
                );
                // console.log(
                //   "ModifyLiquidityEvent inserted:",
                //   modifyLiquidityEvent
                // );
                modifyLiquidityEventCount++;
                break;
              //   default:
              //     console.error("Unknown event name:", eventName);
              //     return;
            }
          } catch (error) {
            console.error("Error decoding log:", error);
            console.error("Raw event data:", {
              topics,
              data,
              blockNumber,
              timestamp,
            });
            return;
          }
        }
      });
    }
  } catch (error) {
    console.error("Error in main function:", error);
    // Log counts even if there's an error
    console.log("\nEvent Processing Summary (before error):");
    console.log(`SwapEvents processed: ${swapEventCount}`);
    console.log(
      `ModifyLiquidityEvents processed: ${modifyLiquidityEventCount}`
    );
  } finally {
    dbManager.close();
  }
}

// Ensure the data directory exists
import { mkdirSync } from "fs";
try {
  mkdirSync(path.join(__dirname, "../data"), { recursive: true });
} catch (error) {
  console.error("Error creating data directory:", error);
}

main();
