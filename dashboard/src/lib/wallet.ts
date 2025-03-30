import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { anvil } from "viem/chains";

export const config = getDefaultConfig({
  appName: "Liquidity Oracle Dashboard",
  projectId: "YOUR_PROJECT_ID", // not needed for local development
  chains: [anvil],
  transports: {
    [anvil.id]: http(),
  },
});
