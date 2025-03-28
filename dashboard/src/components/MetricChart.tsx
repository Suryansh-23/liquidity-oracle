import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { MetricDataPoint } from "../lib/hooks";
import { format } from "date-fns";

interface MetricChartProps {
  data: MetricDataPoint[];
  color?: string;
}

export function MetricChart({ data, color = "#4f46e5" }: MetricChartProps) {
  return (
    <div className="h-48 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="timestamp"
            tickFormatter={(timestamp) => format(timestamp, "HH:mm:ss")}
            interval="preserveStartEnd"
          />
          <YAxis />
          <Tooltip
            labelFormatter={(timestamp) => format(timestamp, "HH:mm:ss")}
            formatter={(value: number) => [value.toFixed(2), "Value"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
