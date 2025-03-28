import { Address, createWalletClient, getContract, http } from "viem";
import { anvil } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { sanitizeTickRange } from "./utils";

// Load environment variables
const key = process.env.PRIVATE_KEY;
if (!key) {
  throw new Error("Private key not found in environment variables.");
}

// Create account from private key
const account = privateKeyToAccount(key as `0x${string}`);

// Initialize the client
const client = createWalletClient({
  account,
  chain: anvil,
  transport: http(),
});

// Contract ABI for the liquidity modification functions
const abi = [
  {
    inputs: [
      { name: "tickLower", type: "int24" },
      { name: "tickUpper", type: "int24" },
      { name: "liquidityDelta", type: "int256" }
    ],
    name: "modifyLiquidity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Get contract instance
const contract = getContract({
  address: process.env.CONTRACT_ADDRESS! as Address,
  abi,
  client,
});

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
    
    // Call the contract directly
    const hash = await client.writeContract({
      account,
      address: process.env.CONTRACT_ADDRESS! as Address,
      abi,
      functionName: "modifyLiquidity",
      args: [sanitizedTickLower, sanitizedTickUpper, liquidityDelta]
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
