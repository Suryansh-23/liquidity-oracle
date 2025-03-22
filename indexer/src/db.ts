import Database from "better-sqlite3";
import { ModifyLiquidityEvent, SwapEvent } from "./types";

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  private initializeTables() {
    // Create ModifyLiquidity events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS modify_liquidity_events (
        txnHash TEXT PRIMARY KEY,
        id TEXT NOT NULL,
        sender TEXT NOT NULL,
        tickLower TEXT NOT NULL,
        tickUpper TEXT NOT NULL,
        liquidityDelta TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        blockNumber INTEGER NOT NULL
      )
    `);

    // Create Swap events table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS swap_events (
        txnHash TEXT PRIMARY KEY,
        id TEXT NOT NULL,
        sender TEXT NOT NULL,
        amount0 TEXT NOT NULL,
        amount1 TEXT NOT NULL,
        sqrtPriceX96 TEXT NOT NULL,
        liquidity TEXT NOT NULL,
        tick TEXT NOT NULL,
        fee TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        blockNumber INTEGER NOT NULL
      )
    `);

    // Create indexes for common queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_modify_liquidity_timestamp ON modify_liquidity_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_modify_liquidity_sender ON modify_liquidity_events(sender);
      CREATE INDEX IF NOT EXISTS idx_swap_timestamp ON swap_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_swap_sender ON swap_events(sender);
    `);
  }

  public insertModifyLiquidityEvent(
    event: ModifyLiquidityEvent,
    txnHash: string,
    timestamp: number,
    blockNumber: number
  ) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO modify_liquidity_events 
      (txnHash, id, sender, tickLower, tickUpper, liquidityDelta, timestamp, blockNumber)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      txnHash,
      event.id,
      event.sender,
      event.tickLower.toString(),
      event.tickUpper.toString(),
      event.liquidityDelta.toString(), // Convert to string to handle large numbers
      timestamp,
      blockNumber
    );
  }

  public insertSwapEvent(
    event: SwapEvent,
    txnHash: string,
    timestamp: number,
    blockNumber: number
  ) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO swap_events 
      (txnHash, id, sender, amount0, amount1, sqrtPriceX96, liquidity, tick, fee, timestamp, blockNumber)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        txnHash,
        event.id,
        event.sender,
        event.amount0.toString(), // Convert to string to handle large numbers
        event.amount1.toString(), // Convert to string to handle large numbers
        event.sqrtPriceX96.toString(), // Convert to string to handle large numbers
        event.liquidity.toString(), // Convert to string to handle large numbers
        event.tick.toString(),
        event.fee.toString(),
        timestamp,
        blockNumber
      );
    } catch (error) {
      console.error("Error inserting swap event:", error);
      console.error(
        "Event data:",
        JSON.stringify(event, (_, v) =>
          typeof v === "bigint" ? v.toString() : v
        )
      );
      throw error;
    }
  }

  public getModifyLiquidityEventsCount(): number {
    const stmt = this.db.prepare(
      "SELECT COUNT(*) as count FROM modify_liquidity_events"
    );
    const result = stmt.get() as { count: number };
    return result.count;
  }

  public getSwapEventsCount(): number {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM swap_events");
    const result = stmt.get() as { count: number };
    return result.count;
  }

  public printDatabaseStats(): void {
    const modifyLiquidityCount = this.getModifyLiquidityEventsCount();
    const swapCount = this.getSwapEventsCount();

    console.log("\nDatabase Statistics:");
    console.log("-------------------");
    console.log(`Total ModifyLiquidity Events: ${modifyLiquidityCount}`);
    console.log(`Total Swap Events: ${swapCount}`);
    console.log(`Total Events: ${modifyLiquidityCount + swapCount}`);
    console.log("-------------------\n");
  }

  public close() {
    this.db.close();
  }
}
