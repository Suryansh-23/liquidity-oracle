export interface ModifyLiquidityEvent {
  id: string;
  sender: string;
  tickLower: BigInt;
  tickUpper: BigInt;
  liquidityDelta: string;
  salt: string;
}

export interface SwapEvent {
  id: string;
  sender: string;
  amount0: string;
  amount1: string;
  sqrtPriceX96: string;
  liquidity: string;
  tick: BigInt;
  fee: BigInt;
}
