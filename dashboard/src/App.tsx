import DashboardLayout from "./components/layout/DashboardLayout";
import MetricCard from "./components/ui/MetricCard";
import MetricChart from "./components/charts/MetricChart";

// Sample data - will be replaced with real data later
const sampleTimeSeriesData = Array.from({ length: 24 }, (_, i) => ({
  timestamp: Date.now() - (23 - i) * 3600000,
  value: Math.random() * 100,
}));

export default function App() {
  return (
    <DashboardLayout>
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          title="Liquidity Transition"
          value="87.5K"
          change={2.5}
          timestamp={new Date()}
        />
        <MetricCard
          title="Volatility"
          value="12.3%"
          change={-1.8}
          timestamp={new Date()}
        />
        <MetricCard
          title="Market Depth"
          value="245.8K"
          change={5.2}
          timestamp={new Date()}
        />
        <MetricCard
          title="Spread"
          value="0.15%"
          change={-0.02}
          timestamp={new Date()}
        />
        <MetricCard
          title="Liquidity Concentration"
          value="68%"
          change={3.1}
          timestamp={new Date()}
        />
      </div>

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-0 overflow-hidden">
          <MetricChart
            title="Liquidity Transition Over Time"
            data={sampleTimeSeriesData}
            color="#60a5fa"
          />
        </div>
        <div className="card p-0 overflow-hidden">
          <MetricChart
            title="Volatility Over Time"
            data={sampleTimeSeriesData}
            color="#f87171"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-0 overflow-hidden">
          <MetricChart
            title="Market Depth Over Time"
            data={sampleTimeSeriesData}
            color="#34d399"
          />
        </div>
        <div className="card p-0 overflow-hidden">
          <MetricChart
            title="Spread Analysis"
            data={sampleTimeSeriesData}
            color="#fbbf24"
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="card p-0 overflow-hidden">
          <MetricChart
            title="Liquidity Concentration Distribution"
            data={sampleTimeSeriesData}
            color="#a78bfa"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
