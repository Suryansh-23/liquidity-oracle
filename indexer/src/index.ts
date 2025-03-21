import {
  Decoder,
  HypersyncClient,
  JoinMode,
  LogField,
} from "@envio-dev/hypersync-client";
import { config } from "dotenv";
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
import { stringify } from "./utils";
import { ModifyLiquidityEvent } from "./types";

// Load environment variables from .env file
config();

async function main() {
  console.info(`Starting indexer on ${process.env.NETWORK_NAME}...`);

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

  // a mapping for pool address to event data
  const perPoolEventMapping = new Map<string, Map<string, unknown[]>>();

  // Define the Hypersync query to get events we're interested in
  let query = {
    fromBlock: 0,
    logs: [
      {
        // Get all events that have any of the topic0 values we want
        topics: [topic0_list],
      },
    ],
    fieldSelection: {
      log: [
        LogField.Data,
        LogField.Address,
        LogField.Topic0,
        LogField.Topic1,
        LogField.Topic2,
        LogField.Topic3,
      ],
    },
    joinMode: JoinMode.Default,
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
        break;
      }

      if (!res.nextBlock) {
        console.warn("Warning: Missing nextBlock in response");
        continue;
      }

      res.data.forEach((event) => {
        const { topics, data } = event.log;
        const topic0 = topics[0];

        if (!topic0) {
          console.error("Log has no topic0:", event.log);
          return;
        }

        if (!data) {
          console.error("Log has no data:", event.log);
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
              topics: event.log.topics as [`0x${string}`, ...`0x${string}`[]],
              data: (event.log.data as Hex) || "0x",
            });
            if (!eventName) {
              console.error("Event name is null or undefined");
              return;
            }

            if (!decoded) {
              console.error("Decoded event is null or undefined");
              return;
            }

            switch (eventName) {
              case "Swap":
                break;
              case "ModifyLiquidity":
                const params = decoded as unknown as ModifyLiquidityEvent;
                break;
            }

            // console.log(
            //   `Decoded event: ${eventName}, args: ${stringify(decoded)}`,
            //   `from address: ${event.log.address}`
            // );
          } catch (error) {
            console.error("Error decoding log:", error);
            return;
          }
        } else {
          console.error("No ABI found for topic0:", topic0);
        }
      });
    }
  } catch (error) {
    console.error("Error in main function:", error);
  }
}

main();
