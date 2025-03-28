import { config } from "dotenv";
import {
  Address,
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import { sanitizeTickRange } from "./utils";

config();

// Load environment variables
const key = process.env.PRIVATE_KEY;
if (!key) {
  throw new Error("Private key not found in environment variables.");
}

// Create account from private key
const account = privateKeyToAccount(key as `0x${string}`);

// Initialize the client
const publicClient = createPublicClient({
  chain: anvil,
  transport: http(),
});

const walletClient = createWalletClient({
  account,
  chain: anvil,
  transport: http(),
});

// Contract ABI for the liquidity modification functions
const abi = parseAbi([
  "function modifyLiquidity(int24 tickLower, int24 tickUpper, int256 liquidityDelta) external",
]);

const modifyLiquidity = async (
  tickLower: number,
  tickUpper: number,
  liquidityDelta: bigint,
  tickSpacing: number = 10 // Default tick spacing
): Promise<void> => {
  try {
    // Sanitize tick range using the utility function
    const [sanitizedTickLower, sanitizedTickUpper] = sanitizeTickRange(
      tickLower,
      tickUpper,
      tickSpacing
    );

    console.log(
      "Calling function modifyLiquidity on contract...",
      process.env.ROUTER_ADDRESS
    );

    // Call the contract directly
    const hash = await walletClient.writeContract({
      account,
      address: process.env.ROUTER_ADDRESS as Address,
      abi,
      functionName: "modifyLiquidity",
      args: [sanitizedTickLower, sanitizedTickUpper, liquidityDelta],
    });

    console.log(`Modified liquidity with hash: ${hash}`);
    console.log(`Ticks: ${sanitizedTickLower} -> ${sanitizedTickUpper}`);
    console.log(`Delta: ${liquidityDelta.toString()}`);
  } catch (error) {
    console.error("Error in modifyLiquidity:", error);
    throw error;
  }
};

export default modifyLiquidity;
