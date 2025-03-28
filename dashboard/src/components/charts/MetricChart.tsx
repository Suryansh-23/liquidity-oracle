import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface DataPoint {
  timestamp: number;
  value: number;
}

interface MetricChartProps {
  data: DataPoint[];
  title: string;
  color?: string;
}

export default function MetricChart({
  data,
  title,
  color = "#60a5fa",
}: MetricChartProps) {
  return (
    <div className="p-6">
      <h3 className="mb-4 text-lg font-medium text-gray-200">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1E293B"
              vertical={false}
            />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(timestamp) => format(timestamp, "HH:mm")}
              stroke="#64748B"
              axisLine={{ stroke: "#1E293B" }}
              tickLine={{ stroke: "#1E293B" }}
            />
            <YAxis
              stroke="#64748B"
              axisLine={{ stroke: "#1E293B" }}
              tickLine={{ stroke: "#1E293B" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1E293B",
                border: "1px solid #2563eb40",
                borderRadius: "6px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              labelFormatter={(timestamp) => format(timestamp, "HH:mm:ss")}
              itemStyle={{ color: "#E2E8F0" }}
              labelStyle={{ color: "#94A3B8" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 2,
                stroke: "#0F172A",
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
