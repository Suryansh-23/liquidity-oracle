import { usePoolMetrics, formatMetric, useConnectionStatus } from "./lib/hooks";
import { MetricCard } from "./components/MetricCard";
import { StatusBadge } from "./components/StatusBadge";
import { ConnectButton } from "./components/ConnectButton";
import { WalletProvider } from "./components/WalletProvider";
import { LiquidityDialog } from "./components/LiquidityDialog";
import { useAccount } from "wagmi";

const ORACLE_ADDRESS = import.meta.env.VITE_ORACLE_ADDRESS;

if (!ORACLE_ADDRESS) {
  throw new Error("VITE_ORACLE_ADDRESS not set in environment");
}

const METRIC_COLORS = {
  liqTransition: "#818cf8", // Lighter Indigo for dark mode
  volatility: "#f87171", // Lighter Red for dark mode
  depth: "#34d399", // Lighter Green for dark mode
  spread: "#c084fc", // Lighter Purple for dark mode
  liqConcentration: "#22d3ee", // Lighter Cyan for dark mode
};

function DashboardContent() {
  const { current: metrics, history } = usePoolMetrics(ORACLE_ADDRESS);
  const connectionStatus = useConnectionStatus();
  const { isConnected } = useAccount();

  const handleLiquidityModification = (
    lowerTick: number,
    upperTick: number,
    liquidityDelta: string
  ) => {
    // TODO: Implement liquidity modification logic
    console.log("Modifying liquidity:", {
      lowerTick,
      upperTick,
      liquidityDelta,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 shadow">
        <div className="mx-auto max-w-[108rem] px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold tracking-tight text-gray-100">
                Liquidity Oracle Dashboard
              </h1>
              <StatusBadge
                isConnected={connectionStatus.isConnected}
                lastUpdate={connectionStatus.lastUpdate}
                networkName={connectionStatus.networkName}
                blockNumber={connectionStatus.blockNumber}
                error={connectionStatus.error}
              />
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-[108rem] py-6 sm:px-6 lg:px-8">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h2 className="text-2xl font-semibold mb-4">
                Connect your wallet to view metrics
              </h2>
              <p className="text-gray-400 max-w-lg">
                Connect your wallet to the Anvil local network to view real-time
                liquidity metrics and analytics.
              </p>
            </div>
          ) : (
            <div className="flex">
              <div className="flex-1 pr-6">
                <div className="grid grid-cols-2 gap-6">
                  <MetricCard
                    title="Liquidity Transition"
                    value={metrics ? formatMetric(metrics.liqTransition) : "-"}
                    description="Measures the rate of liquidity changes"
                    history={history.liqTransition}
                    color={METRIC_COLORS.liqTransition}
                  />
                  <MetricCard
                    title="Volatility"
                    value={metrics ? formatMetric(metrics.volatility) : "-"}
                    description="Current market volatility metric"
                    history={history.volatility}
                    color={METRIC_COLORS.volatility}
                  />
                  <MetricCard
                    title="Market Depth"
                    value={metrics ? formatMetric(metrics.depth) : "-"}
                    description="Available liquidity depth in the market"
                    history={history.depth}
                    color={METRIC_COLORS.depth}
                  />
                  <MetricCard
                    title="Spread"
                    value={metrics ? formatMetric(metrics.spread) : "-"}
                    description="Current bid-ask spread"
                    history={history.spread}
                    color={METRIC_COLORS.spread}
                  />
                  <MetricCard
                    className="col-span-2"
                    title="Liquidity Concentration"
                    value={
                      metrics ? formatMetric(metrics.liqConcentration) : "-"
                    }
                    description="Measure of liquidity distribution"
                    history={history.liqConcentration}
                    color={METRIC_COLORS.liqConcentration}
                  />
                </div>
              </div>

              <div className="w-px bg-gray-700 mx-6" />

              <div className="w-96">
                <LiquidityDialog onSubmit={handleLiquidityModification} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <DashboardContent />
    </WalletProvider>
  );
}
