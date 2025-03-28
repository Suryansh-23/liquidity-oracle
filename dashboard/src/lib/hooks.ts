import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { anvil } from "viem/chains";

// Define the PoolMetrics type to match the Solidity struct
export interface PoolMetrics {
  liqTransition: bigint;
  volatility: bigint;
  depth: bigint;
  spread: bigint;
  liqConcentration: bigint;
}

export interface MetricDataPoint {
  timestamp: number;
  value: number;
}

export interface HistoricalMetrics {
  liqTransition: MetricDataPoint[];
  volatility: MetricDataPoint[];
  depth: MetricDataPoint[];
  spread: MetricDataPoint[];
  liqConcentration: MetricDataPoint[];
}

const MAX_HISTORY_POINTS = 50;

// Hook for listening to PoolMetricsUpdated events
export function usePoolMetrics(oracleAddress: string) {
  const [metrics, setMetrics] = useState<PoolMetrics | null>(null);
  const [history, setHistory] = useState<HistoricalMetrics>({
    liqTransition: [],
    volatility: [],
    depth: [],
    spread: [],
    liqConcentration: [],
  });

  useEffect(() => {
    const client = createPublicClient({
      chain: anvil,
      transport: http(),
    });

    // Create the event listener
    const unwatch = client.watchEvent({
      address: oracleAddress as `0x${string}`,
      event: {
        type: "event",
        name: "PoolMetricsUpdated",
        inputs: [
          {
            name: "poolMetrics",
            type: "tuple",
            indexed: false,
            internalType: "struct OracleHook.PoolMetrics",
            components: [
              {
                name: "liqTransition",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "volatility",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "depth",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "spread",
                type: "uint256",
                internalType: "uint256",
              },
              {
                name: "liqConcentration",
                type: "uint256",
                internalType: "uint256",
              },
            ],
          },
        ],
        anonymous: false,
      } as const,
      onLogs: (logs) => {
        const [log] = logs;
        if (log) {
          const newMetrics = log.args.poolMetrics as PoolMetrics;
          setMetrics(newMetrics);

          // Update historical data
          const timestamp = Date.now();
          setHistory((prev) => {
            const updateMetricHistory = (
              current: MetricDataPoint[],
              newValue: bigint
            ) => {
              const newPoint = {
                timestamp,
                value: Number(newValue) / 1e4,
              };
              const updated = [...current, newPoint];
              console.log(updated);
              return updated.slice(-MAX_HISTORY_POINTS);
            };

            return {
              liqTransition: updateMetricHistory(
                prev.liqTransition,
                newMetrics.liqTransition
              ),
              volatility: updateMetricHistory(
                prev.volatility,
                newMetrics.volatility
              ),
              depth: updateMetricHistory(prev.depth, newMetrics.depth),
              spread: updateMetricHistory(prev.spread, newMetrics.spread),
              liqConcentration: updateMetricHistory(
                prev.liqConcentration,
                newMetrics.liqConcentration
              ),
            };
          });
        }
      },
    });

    // Cleanup subscription
    return () => {
      unwatch();
    };
  }, [oracleAddress]);

  return { current: metrics, history };
}

// Helper function to format bigint values for display
export function formatMetric(value: bigint): string {
  return (Number(value) / 1e4).toFixed(2);
}
