import { MetricDataPoint } from "../lib/hooks";
import { MetricChart } from "./MetricChart";

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  history: MetricDataPoint[];
  color?: string;
}

export function MetricCard({
  title,
  value,
  description,
  history,
  color,
}: MetricCardProps) {
  return (
    <div className="bg-white overflow-hidden rounded-lg shadow">
      <div className="p-5">
        <div className="flex items-center">
          <div className="w-full">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
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
