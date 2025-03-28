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

console.log(process.env);

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

publicClient.watchContractEvent({
  address: "0xb0d4afd8879ed9f52b28595d31b441d079b2ca07",
  abi: [
    {
      type: "event",
      name: "NewTaskCreated",
      inputs: [
        {
          name: "taskIndex",
          type: "uint32",
          indexed: true,
          internalType: "uint32",
        },
        {
          name: "task",
          type: "tuple",
          indexed: false,
          internalType: "struct OracleServiceManager.Task",
          components: [
            {
              name: "poolId",
              type: "bytes32",
              internalType: "bytes32",
            },
            {
              name: "activeTick",
              type: "int24",
              internalType: "int24",
            },
            {
              name: "tickSpacing",
              type: "int24",
              internalType: "int24",
            },
          ],
        },
      ],
      anonymous: false,
    },
  ] as const,
  onLogs: (logs) => console.log("New task created:", logs),
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
      // nonce:
      //   (await publicClient.getTransactionCount({ address: account.address })) +
      //   1 +
      //   Math.trunc(Math.random() * 1000),
      chain: anvil,
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
