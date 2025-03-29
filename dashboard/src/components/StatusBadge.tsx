import { format, formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

interface StatusBadgeProps {
  isConnected: boolean;
  lastUpdate: Date | null;
}

export function StatusBadge({ isConnected, lastUpdate }: StatusBadgeProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  // Update the time ago string every second
  useEffect(() => {
    if (!lastUpdate) return;

    const updateTimeAgo = () => {
      setTimeAgo(formatDistanceToNow(lastUpdate, { addSuffix: true }));
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);

    return () => clearInterval(interval);
  }, [lastUpdate]);

  return (
    <div className="flex items-center gap-2 bg-gray-700 px-3 py-1.5 rounded-full text-sm">
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isConnected ? "bg-green-400" : "bg-red-400"
            }`}
          ></span>
          <span
            className={`relative inline-flex rounded-full h-3 w-3 ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
        </span>
        <span className="text-gray-300">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      {lastUpdate && (
        <div className="text-gray-400 border-l border-gray-600 pl-2 flex gap-2">
          <span>Last update: {format(lastUpdate, "HH:mm:ss")}</span>
          <span className="text-gray-500">({timeAgo})</span>
        </div>
      )}
    </div>
  );
}
