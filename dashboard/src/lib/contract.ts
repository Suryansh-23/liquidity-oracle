import { Address, parseAbi } from "viem";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";

// Contract ABI for the liquidity modification functions
export const LIQUIDITY_ABI = parseAbi([
  "function modifyLiquidity(int24 tickLower, int24 tickUpper, int256 liquidityDelta) external",
]);

export const ROUTER_ADDRESS = import.meta.env.VITE_ROUTER_ADDRESS as Address;

if (!ROUTER_ADDRESS) {
  throw new Error("VITE_ROUTER_ADDRESS not set in environment");
}

// Hook for modifying liquidity
export function useModifyLiquidity() {
  const {
    data,
    writeContract,
    isPending,
    error: writeError,
  } = useWriteContract();

  const { data: receipt, isLoading: isConfirming } =
    useWaitForTransactionReceipt({
      hash: data,
    });

  const modifyLiquidity = async (args: [number, number, bigint]) => {
    try {
      const result = await writeContract({
        abi: LIQUIDITY_ABI,
        address: ROUTER_ADDRESS,
        functionName: "modifyLiquidity",
        args,
      });
      return result;
    } catch (err) {
      console.error("Error in modifyLiquidity:", err);
      throw err;
    }
  };

  return {
    modifyLiquidity,
    isLoading: isPending || isConfirming,
    isSuccess: Boolean(receipt),
    error: writeError,
    hash: data,
  };
}
