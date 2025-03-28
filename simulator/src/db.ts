import Database from "better-sqlite3";

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
  }

  public *getLiquidityEventsIterator(): Generator<LiquidityEvent> {
    while (true) {
      // Infinite loop
      const stmt = this.db.prepare(`
          SELECT tickLower, tickUpper, liquidityDelta
          FROM modify_liquidity_events
          ORDER BY blockNumber ASC
      `);

      const iterator = stmt.iterate();

      for (const row of iterator) {
        const typedRow = row as {
          tickLower: string;
          tickUpper: string;
          liquidityDelta: string;
        };
        yield {
          tickLower: Number(typedRow.tickLower),
          tickUpper: Number(typedRow.tickUpper),
          liquidityDelta: BigInt(typedRow.liquidityDelta),
        };
      }
      // After going through all events, the loop will start again
    }
  }

  public close(): void {
    this.db.close();
  }
}
