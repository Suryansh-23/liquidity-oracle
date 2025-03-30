import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { useState, useEffect, useRef, useMemo } from "react";

interface LiquidityVisualizerProps {
  lowerTick: number;
  upperTick: number;
  onTickChange: (lower: number, upper: number) => void;
}

export function LiquidityVisualizer({
  lowerTick,
  upperTick,
  onTickChange,
}: LiquidityVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ type: "lower" | "upper" | null; startX: number }>({
    type: null,
    startX: 0,
  });
  const [localLower, setLocalLower] = useState(lowerTick);
  const [localUpper, setLocalUpper] = useState(upperTick);

  // Memoize the data with a more distributed curve
  const data = useMemo(() => {
    const points = 221; // Keep the same number of points
    return Array.from({ length: points }, (_, i) => {
      const tick = i * 100 - 11000;

      // Create multiple peaks with different heights and widths
      const peak1 = Math.exp(-(Math.pow(i - 55, 2) / 400)) * 0.8; // Left peak
      const peak2 = Math.exp(-(Math.pow(i - 110, 2) / 800)); // Center peak
      const peak3 = Math.exp(-(Math.pow(i - 165, 2) / 400)) * 0.9; // Right peak

      // Add some noise for more realistic distribution
      const noise = Math.sin(i * 0.3) * 0.1;

      // Combine peaks and ensure minimum liquidity
      const liquidity = Math.max(
        peak1 + peak2 + peak3 + noise,
        0.1 // Minimum liquidity level
      );

      return {
        tick,
        liquidity: liquidity * 0.8, // Scale down slightly for better visualization
      };
    });
  }, []);

  useEffect(() => {
    setLocalLower(lowerTick);
    setLocalUpper(upperTick);
  }, [lowerTick, upperTick]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.type || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;

      // Convert x position to tick value
      const tickValue = Math.round((x / width) * 22000 - 11000);
      const clampedTick = Math.max(-11000, Math.min(11000, tickValue));

      if (dragRef.current.type === "lower") {
        if (clampedTick < localUpper) {
          setLocalLower(clampedTick);
          onTickChange(clampedTick, localUpper);
        }
      } else {
        if (clampedTick > localLower) {
          setLocalUpper(clampedTick);
          onTickChange(localLower, clampedTick);
        }
      }
    };

    const handleMouseUp = () => {
      dragRef.current.type = null;
    };

    if (dragRef.current.type) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragRef.current.type, localLower, localUpper, onTickChange]);

  // Convert tick values to percentage positions
  const lowerPercent = ((localLower + 11000) / 22000) * 100;
  const upperPercent = ((localUpper + 11000) / 22000) * 100;

  return (
    <div className="mt-4 mb-6" ref={containerRef}>
      <div className="h-40 relative select-none">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
          >
            <XAxis
              dataKey="tick"
              type="number"
              domain={[-11000, 11000]}
              tick={{ fill: "#6B7280" }}
              tickFormatter={(value) => value.toString()}
            />
            <YAxis hide />
            <Bar dataKey="liquidity" fill="#374151" isAnimationActive={false} />
            {/* Selected range overlay */}
            <rect
              x={`${lowerPercent}%`}
              y="0"
              width={`${upperPercent - lowerPercent}%`}
              height="100%"
              fill="rgba(79, 70, 229, 0.2)"
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Drag handles */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-indigo-600 cursor-ew-resize"
          style={{ left: `${lowerPercent}%` }}
          onMouseDown={() => {
            dragRef.current.type = "lower";
            dragRef.current.startX = lowerPercent;
          }}
        >
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full" />
        </div>
        <div
          className="absolute top-0 bottom-0 w-1 bg-indigo-600 cursor-ew-resize"
          style={{ left: `${upperPercent}%` }}
          onMouseDown={() => {
            dragRef.current.type = "upper";
            dragRef.current.startX = upperPercent;
          }}
        >
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-600 rounded-full" />
        </div>
      </div>

      <div className="flex justify-between text-sm text-gray-400 mt-2">
        <span>Lower: {localLower}</span>
        <span>Upper: {localUpper}</span>
      </div>
    </div>
  );
}
