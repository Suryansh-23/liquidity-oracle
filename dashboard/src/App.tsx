import { usePoolMetrics, formatMetric } from "./lib/hooks";
import { MetricCard } from "./components/MetricCard";
import { StatusBadge } from "./components/StatusBadge";

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

export default function App() {
  const { current: metrics, history, status } = usePoolMetrics(ORACLE_ADDRESS);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="bg-gray-800 shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-100">
              Liquidity Oracle Dashboard
            </h1>
            <StatusBadge
              isConnected={status.isConnected}
              lastUpdate={status.lastUpdate}
            />
          </div>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
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
              value={metrics ? formatMetric(metrics.liqConcentration) : "-"}
              description="Measure of liquidity distribution"
              history={history.liqConcentration}
              color={METRIC_COLORS.liqConcentration}
            />
            {!metrics && (
              <div className="col-span-2 text-center py-10">
                <p className="text-gray-400">Waiting for metrics update...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
