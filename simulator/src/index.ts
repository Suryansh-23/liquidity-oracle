import { config } from "dotenv";
import path from "path";
import { DatabaseManager } from "./db";
import modifyLiquidity from "./modifyLiquidity";

// Load environment variables
config();

const dbPath = path.join(
  __dirname,
  `../events/${process.env.NETWORK_NAME!}.db`
);

async function main() {
  // Initialize database manager
  const dbManager = DatabaseManager.getInstance(dbPath);

  // Get iterator for liquidity events
  const eventsIterator = dbManager.getLiquidityEventsIterator();

  // Get interval and tickSpacing from env or use defaults
  const interval = parseInt(process.env.INTERVAL || "2000"); // default 5 seconds
  const tickSpacing = parseInt(process.env.TICK_SPACING || "10"); // default 10

  for (const event of eventsIterator) {
    try {
      // Call contract with the event data
      await modifyLiquidity(
        event.tickLower,
        event.tickUpper,
        event.liquidityDelta,
        tickSpacing
      );

      // Wait for specified interval
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      console.error("Error processing event:", error);
      // Continue with next event even if current one fails
      continue;
    }
  }

  // Close database connection when done
  dbManager.close();
}

main().catch(console.error);
