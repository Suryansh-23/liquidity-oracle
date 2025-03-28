import Database from "better-sqlite3";
import { join } from "path";

interface LiquidityEvent {
  tickLower: number;
  tickUpper: number;
  liquidityDelta: bigint;
}

export class DatabaseManager {
  private db: Database.Database;
  private static instance: DatabaseManager;

  private constructor(dbPath: string) {
    try {
      this.db = new Database(dbPath, {
        verbose: console.log,
      });
      this.init();
      // Run validations automatically after initialization
      this.validateDatabase();
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  public static getInstance(dbPath: string): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager(dbPath);
    }
    return DatabaseManager.instance;
  }

  private init(): void {
    // Enable foreign keys
    this.db.pragma("foreign_keys = ON");

    // Create tables if they don't exist
    this.db.exec(`
        CREATE TABLE IF NOT EXISTS liquidity_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            blockNumber INTEGER NOT NULL,
            tickLower TEXT NOT NULL,
            tickUpper TEXT NOT NULL,
            liquidityDelta TEXT NOT NULL
        )
    `);
  }

  public validateDatabaseStructure(): void {
    try {
      // Check if liquidity_events table exists and has correct schema
      const tableInfo = this.db
        .prepare(
          `
                SELECT sql FROM sqlite_master 
                WHERE type='table' AND name='liquidity_events'
            `
        )
        .get() as { sql: string } | undefined;

      if (!tableInfo) {
        throw new Error("liquidity_events table does not exist");
      }

      // Check if all required columns exist with correct types
      const columns = this.db
        .prepare(`PRAGMA table_info(liquidity_events)`)
        .all() as {
        name: string;
        type: string;
        notnull: number;
      }[];

      const requiredColumns = {
        id: "INTEGER",
        blockNumber: "INTEGER",
        tickLower: "TEXT",
        tickUpper: "TEXT",
        liquidityDelta: "TEXT",
      };

      for (const [colName, colType] of Object.entries(requiredColumns)) {
        const column = columns.find((col) => col.name === colName);
        if (!column) {
          throw new Error(`Missing required column: ${colName}`);
        }
        if (!column.type.toUpperCase().includes(colType)) {
          throw new Error(
            `Invalid type for column ${colName}: expected ${colType}, got ${column.type}`
          );
        }
      }

      console.log("Database structure validation passed successfully");
    } catch (error) {
      console.error("Database structure validation failed:", error);
      throw error;
    }
  }

  public validateDataIntegrity(): void {
    try {
      // Check for null values in required fields
      const nullCheckResult = this.db
        .prepare(
          `
                SELECT COUNT(*) as count
                FROM liquidity_events
                WHERE blockNumber IS NULL 
                OR tickLower IS NULL 
                OR tickUpper IS NULL 
                OR liquidityDelta IS NULL
            `
        )
        .get() as { count: number };

      if (nullCheckResult.count > 0) {
        throw new Error(
          `Found ${nullCheckResult.count} rows with NULL values in required fields`
        );
      }

      // Validate numeric string fields can be parsed
      const numericFields = ["tickLower", "tickUpper", "liquidityDelta"];
      for (const field of numericFields) {
        const invalidNumbers = this.db
          .prepare(
            `
                    SELECT COUNT(*) as count
                    FROM liquidity_events
                    WHERE ${field} NOT REGEXP '^-?[0-9]+$'
                `
          )
          .get() as { count: number };

        if (invalidNumbers.count > 0) {
          throw new Error(
            `Found ${invalidNumbers.count} rows with invalid ${field} values`
          );
        }
      }

      // Check for chronological order by blockNumber
      const orderResult = this.db
        .prepare(
          `
                SELECT COUNT(*) as count
                FROM liquidity_events e1
                JOIN liquidity_events e2 ON e1.id > e2.id
                WHERE e1.blockNumber < e2.blockNumber
            `
        )
        .get() as { count: number };

      if (orderResult.count > 0) {
        throw new Error(
          `Found ${orderResult.count} blockNumber ordering inconsistencies`
        );
      }

      console.log("Data integrity validation passed successfully");
    } catch (error) {
      console.error("Data integrity validation failed:", error);
      throw error;
    }
  }

  public validateDatabase(): void {
    this.validateDatabaseStructure();
    this.validateDataIntegrity();
    console.log("All database validations passed successfully");
  }

  public *getLiquidityEventsIterator(): Generator<LiquidityEvent> {
    const stmt = this.db.prepare(`
        SELECT tickLower, tickUpper, liquidityDelta
        FROM liquidity_events
        ORDER BY blockNumber ASC
    `);

    const iterator = stmt.iterate();

    for (const row of iterator) {
      const typedRow = row as { tickLower: string; tickUpper: string; liquidityDelta: string };
      yield {
        tickLower: Number(typedRow.tickLower),
        tickUpper: Number(typedRow.tickUpper),
        liquidityDelta: BigInt(typedRow.liquidityDelta),
      };
    }
  }

  public close(): void {
    this.db.close();
  }
}
