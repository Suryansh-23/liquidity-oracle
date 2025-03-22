// Event Types
export interface ModifyLiquidityEvent {
  id: string;
  transactionHash: string;
  sender: string;
  tickLower: bigint;
  tickUpper: bigint;
  liquidityDelta: string;
}

export interface SwapEvent {
  id: string;
  transactionHash: string;
  sender: string;
  amount0: string;
  amount1: string;
  sqrtPriceX96: string;
  liquidity: string;
  tick: bigint;
  fee: bigint;
}

// Database Types
export interface DatabaseStats {
  modifyLiquidityCount: number;
  swapCount: number;
  totalCount: number;
}

// Counter Types
export interface EventCounts {
  swapEventCount: number;
  modifyLiquidityEventCount: number;
  totalCount: number;
}
