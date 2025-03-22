import Database from "better-sqlite3";
import { ModifyLiquidityEvent, SwapEvent, DatabaseStats } from "../types";
import { DatabaseError } from "../utils/errors";
import { Logger } from "../utils/logger";

interface BatchEvent<T> {
  event: T;
  timestamp: number;
  blockNumber: number;
}

interface EventBatch {
  modifyLiquidity: BatchEvent<ModifyLiquidityEvent>[];
  swap: BatchEvent<SwapEvent>[];
}

export class DatabaseManager {
  private db: Database.Database;
  private insertSwapStmt!: Database.Statement;
  private insertModifyLiquidityStmt!: Database.Statement;

  constructor(dbPath: string) {
    try {
      this.db = new Database(dbPath);
      this.db.pragma("journal_mode = WAL"); // Better performance and concurrency
      this.initializeTables();
      this.prepareStatements();
    } catch (error) {
      throw new DatabaseError("Failed to initialize database", error);
    }
  }

  private prepareStatements(): void {
    this.insertSwapStmt = this.db.prepare(`
      INSERT OR REPLACE INTO swap_events 
      (txnHash, id, sender, amount0, amount1, sqrtPriceX96, liquidity, tick, fee, timestamp, blockNumber)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.insertModifyLiquidityStmt = this.db.prepare(`
      INSERT OR REPLACE INTO modify_liquidity_events 
      (txnHash, id, sender, tickLower, tickUpper, liquidityDelta, timestamp, blockNumber)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  private initializeTables(): void {
    const transaction = this.db.transaction(() => {
      this.createModifyLiquidityTable();
      this.createSwapEventsTable();
      this.createIndexes();
    });

    try {
      transaction();
      Logger.info("Database tables initialized successfully");
    } catch (error) {
      throw new DatabaseError("Failed to initialize database tables", error);
    }
  }

  private createModifyLiquidityTable(): void {
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
  }

  private createSwapEventsTable(): void {
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
  }

  private createIndexes(): void {
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_modify_liquidity_timestamp ON modify_liquidity_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_modify_liquidity_sender ON modify_liquidity_events(sender);
      CREATE INDEX IF NOT EXISTS idx_modify_liquidity_id ON modify_liquidity_events(id);
      CREATE INDEX IF NOT EXISTS idx_swap_timestamp ON swap_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_swap_sender ON swap_events(sender);
      CREATE INDEX IF NOT EXISTS idx_swap_id ON swap_events(id);
    `);
  }

  public insertModifyLiquidityEvent(
    event: ModifyLiquidityEvent,
    timestamp: number,
    blockNumber: number
  ): void {
    try {
      this.insertModifyLiquidityStmt.run(
        event.transactionHash,
        event.id,
        event.sender,
        event.tickLower.toString(),
        event.tickUpper.toString(),
        event.liquidityDelta.toString(),
        timestamp,
        blockNumber
      );
    } catch (error) {
      throw new DatabaseError("Failed to insert modify liquidity event", error);
    }
  }

  public insertSwapEvent(
    event: SwapEvent,
    timestamp: number,
    blockNumber: number
  ): void {
    try {
      this.insertSwapStmt.run(
        event.transactionHash,
        event.id,
        event.sender,
        event.amount0.toString(),
        event.amount1.toString(),
        event.sqrtPriceX96.toString(),
        event.liquidity.toString(),
        event.tick.toString(),
        event.fee.toString(),
        timestamp,
        blockNumber
      );
    } catch (error) {
      throw new DatabaseError("Failed to insert swap event", error);
    }
  }

  public insertEventsInTransaction(events: EventBatch): void {
    const transaction = this.db.transaction((events: EventBatch) => {
      events.modifyLiquidity.forEach(({ event, timestamp, blockNumber }) => {
        this.insertModifyLiquidityEvent(event, timestamp, blockNumber);
      });
      events.swap.forEach(({ event, timestamp, blockNumber }) => {
        this.insertSwapEvent(event, timestamp, blockNumber);
      });
    });

    try {
      transaction(events);
    } catch (error) {
      throw new DatabaseError("Failed to insert events in transaction", error);
    }
  }

  public getStats(): DatabaseStats {
    try {
      const modifyLiquidityCount = this.getCount("modify_liquidity_events");
      const swapCount = this.getCount("swap_events");
      return {
        modifyLiquidityCount,
        swapCount,
        totalCount: modifyLiquidityCount + swapCount,
      };
    } catch (error) {
      throw new DatabaseError("Failed to get database statistics", error);
    }
  }

  private getCount(table: string): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  public vacuum(): void {
    try {
      this.db.exec("VACUUM");
    } catch (error) {
      throw new DatabaseError("Failed to vacuum database", error);
    }
  }

  public close(): void {
    try {
      this.vacuum();
      this.db.close();
    } catch (error) {
      throw new DatabaseError("Failed to close database", error);
    }
  }
}
