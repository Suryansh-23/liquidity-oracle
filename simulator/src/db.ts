import Database from "better-sqlite3";

interface LiquidityEvent {
  tickLower: number;
  tickUpper: number;
  liquidityDelta: bigint;
}

const K = 11_000;

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

  public *getModifyLiquidityIterator(): Generator<LiquidityEvent> {
    const positions: [number, number, bigint][] = new Array();

    while (true) {
      const choice = Math.random();
      if (choice > 0.75 && positions.length > 1) {
        // Randomly select a position from the list
        const randomIndex = Math.floor(Math.random() * positions.length);
        const [tickLower, tickUpper, liquidityDelta] = positions.splice(
          randomIndex,
          1
        )[0]!;

        yield {
          tickLower,
          tickUpper,
          liquidityDelta,
        };
      } else {
        // Generate a new random position
        const a = Math.round(Math.random() * 2 * K) - K;
        const b = Math.round(Math.random() * 2 * K) - K;
        const tickLower = Math.min(a, b);
        const tickUpper = Math.max(a, b);
        const liquidityDelta = BigInt(
          Math.floor(100_000_000_000_000 * Math.random())
        );

        console.log("Generated liquidityDelta:", liquidityDelta);

        positions.push([tickLower, tickUpper, -liquidityDelta]);
        yield {
          tickLower,
          tickUpper,
          liquidityDelta,
        };
      }
    }
  }

  public close(): void {
    this.db.close();
  }
}
