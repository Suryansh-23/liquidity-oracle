import { Address, createWalletClient, getContract, http } from "viem";
import { anvil } from "viem/chains";

const key = process.env.PRIVATE_KEY as string;
if (!key) {
  throw new Error("Private key not found in environment variables.");
}

// Initialize the client
const client = createWalletClient({
  chain: anvil,
  transport: http(),
  key,
});

// instance of the contract
const contract = getContract({
  address: process.env.CONTRACT_ADDRESS! as Address,
  abi: [], // Add the ABI for the contract
  client,
});

const modifyLiquidity = async (
  tickLower: BigInt,
  tickUpper: BigInt,
  liqDelta: BigInt
) => {};

export default modifyLiquidity;
