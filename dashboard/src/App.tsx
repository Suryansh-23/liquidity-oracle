import { usePoolMetrics, formatMetric } from "./lib/hooks";
import { MetricCard } from "./components/MetricCard";

const ORACLE_ADDRESS = import.meta.env.VITE_ORACLE_ADDRESS;

if (!ORACLE_ADDRESS) {
  throw new Error("VITE_ORACLE_ADDRESS not set in environment");
}

const METRIC_COLORS = {
  liqTransition: "#4f46e5", // Indigo
  volatility: "#dc2626", // Red
  depth: "#059669", // Green
  spread: "#9333ea", // Purple
  liqConcentration: "#0891b2", // Cyan
};

export default function App() {
  const { current: metrics, history } = usePoolMetrics(ORACLE_ADDRESS);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Liquidity Oracle Dashboard
          </h1>
        </div>
      </header>
      <main>
        <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {metrics && (
              <>
                <MetricCard
                  title="Liquidity Transition"
                  value={formatMetric(metrics.liqTransition)}
                  description="Measures the rate of liquidity changes"
                  history={history.liqTransition}
                  color={METRIC_COLORS.liqTransition}
                />
                <MetricCard
                  title="Volatility"
                  value={formatMetric(metrics.volatility)}
                  description="Current market volatility metric"
                  history={history.volatility}
                  color={METRIC_COLORS.volatility}
                />
                <MetricCard
                  title="Market Depth"
                  value={formatMetric(metrics.depth)}
                  description="Available liquidity depth in the market"
                  history={history.depth}
                  color={METRIC_COLORS.depth}
                />
                <MetricCard
                  title="Spread"
                  value={formatMetric(metrics.spread)}
                  description="Current bid-ask spread"
                  history={history.spread}
                  color={METRIC_COLORS.spread}
                />
                <MetricCard
                  title="Liquidity Concentration"
                  value={formatMetric(metrics.liqConcentration)}
                  description="Measure of liquidity distribution"
                  history={history.liqConcentration}
                  color={METRIC_COLORS.liqConcentration}
                />
              </>
            )}
            {!metrics && (
              <div className="col-span-full text-center py-10">
                <p className="text-gray-500">Waiting for metrics update...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
