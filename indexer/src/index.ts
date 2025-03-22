import { HypersyncClient } from "@envio-dev/hypersync-client";
import path from "path";
import { mkdirSync } from "fs";
import { DatabaseManager } from "./database/db";
import { EventProcessor } from "./services/eventProcessor";
import { getConfig, createHypersyncQuery } from "./config/config";
import { Logger } from "./utils/logger";

async function initializeComponents() {
  const config = getConfig();
  Logger.info(`Starting indexer on ${config.networkName}...`);

  // Ensure data directory exists
  try {
    mkdirSync(path.join(__dirname, "../data"), { recursive: true });
  } catch (error) {
    Logger.error("Error creating data directory:", error);
    process.exit(1);
  }

  // Initialize database
  const dbPath = path.join(__dirname, `../data/${config.networkName}.db`);
  const dbManager = new DatabaseManager(dbPath);

  // Initialize event processor
  const eventProcessor = new EventProcessor(dbManager);

  // Initialize Hypersync client
  const client = HypersyncClient.new({
    url: config.hypersyncUrl,
    bearerToken: config.bearerToken,
  });

  return { client, eventProcessor, dbManager };
}

async function main() {
  const { client, eventProcessor, dbManager } = await initializeComponents();

  try {
    const height = await client.getHeight();
    Logger.info(`Starting scan from block 0 to ${height}`);

    // Initialize event stream
    const query = createHypersyncQuery(eventProcessor.getTopic0List());
    const stream = await client.streamEvents(query, {});
    Logger.info("Event stream initialized");

    while (true) {
      const res = await stream.recv();
      if (!res) {
        Logger.info("✓ Reached tip of the chain");
        const stats = dbManager.getStats();
        Logger.databaseStats(stats);
        break;
      }

      if (!res.nextBlock) {
        Logger.warn("Missing nextBlock in response");
        continue;
      }

      // Process events
      eventProcessor.processEvents(res.data);

      // Log progress periodically
      if (res.nextBlock % 1000 === 0) {
        const stats = dbManager.getStats();
        Logger.progress(res.nextBlock, stats);
      }
    }
  } catch (error) {
    Logger.error("Error in main function:", error);
    const stats = dbManager.getStats();
    Logger.databaseStats(stats);
  } finally {
    dbManager.close();
  }
}

// Handle process termination
process.on("SIGINT", () => {
  Logger.info("\nGracefully shutting down...");
  process.exit();
});

main().catch((error) => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});
