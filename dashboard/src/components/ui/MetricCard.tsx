import { formatDistanceToNow } from "date-fns";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  timestamp?: Date;
  className?: string;
}

export default function MetricCard({
  title,
  value,
  change,
  timestamp,
  className,
}: MetricCardProps) {
  return (
    <div className={cn("card p-6", className)}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="metric-label">{title}</h3>
          <p className="metric-value">{value}</p>
        </div>
        {change !== undefined && (
          <div
            className={cn(
              "px-2.5 py-0.5 rounded-full text-sm font-medium",
              change >= 0
                ? "bg-green-900/30 text-green-400 border border-green-800/50"
                : "bg-red-900/30 text-red-400 border border-red-800/50"
            )}
          >
            {change >= 0 ? "+" : ""}
            {change}%
          </div>
        )}
      </div>
      {timestamp && (
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Updated {formatDistanceToNow(timestamp)} ago
        </p>
      )}
    </div>
  );
}
