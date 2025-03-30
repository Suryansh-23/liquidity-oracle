import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { defineChain } from "viem";

export const anvilChain = defineChain({
  id: 31_337,
  name: "Anvil Local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_RPC_URL],
    },
    public: {
      http: [import.meta.env.VITE_RPC_URL],
    },
  },
  blockExplorers: {
    default: { name: "Local Explorer", url: "#" },
  },
  contracts: {
    multicall3: {
      address: "0xca11bde05977b3631167028862be2a173976ca11",
      blockCreated: 0,
    },
  },
  testnet: true,
});

export const config = getDefaultConfig({
  appName: "Liquidity Oracle Dashboard",
  projectId: "YOUR_PROJECT_ID", // not needed for local development
  chains: [anvilChain],
  transports: {
    [anvilChain.id]: http(),
  },
});
