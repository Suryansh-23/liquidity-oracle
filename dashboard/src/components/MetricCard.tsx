import { MetricDataPoint } from "../lib/hooks";
import { MetricChart } from "./MetricChart";

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  history: MetricDataPoint[];
  color?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  description,
  history,
  color,
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`bg-gray-800 overflow-hidden rounded-lg shadow-lg border border-gray-700 ${className}`}
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className="w-full">
            <dl>
              <dt className="text-sm font-medium text-gray-400 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-100">
                  {value}
                </div>
              </dd>
              <dd className="mt-2 text-sm text-gray-500">{description}</dd>
            </dl>
            <MetricChart data={history} color={color} />
          </div>
        </div>
      </div>
    </div>
  );
}
