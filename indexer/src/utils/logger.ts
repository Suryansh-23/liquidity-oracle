import { DatabaseStats } from "../types";

export class Logger {
  static info(message: string): void {
    console.info(`[INFO] ${message}`);
  }

  static error(message: string, error?: unknown): void {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  }

  static warn(message: string): void {
    console.warn(`[WARN] ${message}`);
  }

  static progress(blockNumber: number, stats: DatabaseStats): void {
    console.log("\nIndexing Progress:");
    console.log("----------------");
    console.log(`Current Block: ${blockNumber}`);
    console.log(`Swap Events: ${stats.swapCount}`);
    console.log(`ModifyLiquidity Events: ${stats.modifyLiquidityCount}`);
    console.log(`Total Events: ${stats.totalCount}`);
    console.log("----------------\n");
  }

  static databaseStats(stats: DatabaseStats): void {
    console.log("\nDatabase Statistics:");
    console.log("-------------------");
    console.log(`Total ModifyLiquidity Events: ${stats.modifyLiquidityCount}`);
    console.log(`Total Swap Events: ${stats.swapCount}`);
    console.log(`Total Events: ${stats.totalCount}`);
    console.log("-------------------\n");
  }
}
