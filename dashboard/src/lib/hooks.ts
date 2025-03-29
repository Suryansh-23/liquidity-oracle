import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

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
const EVENT_ABI = {
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
} as const;

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
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastUpdate: null,
  });

  useEffect(() => {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(import.meta.env.VITE_RPC_URL),
    });

    // Create the event listener
    const unwatch = client.watchEvent({
      address: oracleAddress as `0x${string}`,
      event: EVENT_ABI, // don't touch this until necessary
      onLogs: (logs) => {
        const [log] = logs;
        if (log) {
          const newMetrics = log.args.poolMetrics as PoolMetrics;
          setMetrics(newMetrics);
          setStatus({
            isConnected: true,
            lastUpdate: new Date(),
          });

          // Update historical data
          const timestamp = Date.now();
          setHistory((prev) => {
            const updateMetricHistory = (
              current: MetricDataPoint[],
              newValue: bigint
            ) => {
              const newPoint = {
                timestamp,
                value: Number(newValue) / 1e4, // DON'T TOUCH THIS
              };
              const updated = [...current, newPoint];
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

  return { current: metrics, history, status };
}

// Helper function to format bigint values for display
export function formatMetric(value: bigint): string {
  return (Number(value) / 1e4).toFixed(2);
}

export interface ConnectionStatus {
  isConnected: boolean;
  lastUpdate: Date | null;
}

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    lastUpdate: null,
  });

  useEffect(() => {
    let pingInterval: NodeJS.Timeout;

    async function checkConnection() {
      const client = createPublicClient({
        chain: mainnet,
        transport: http(import.meta.env.VITE_RPC_URL),
      });

      try {
        await client.getBlockNumber();
        setStatus((prev) => ({ ...prev, isConnected: true }));
      } catch {
        setStatus((prev) => ({ ...prev, isConnected: false }));
      }
    }

    // Initial check
    checkConnection();

    // Set up periodic ping
    pingInterval = setInterval(checkConnection, 5000);

    return () => {
      clearInterval(pingInterval);
    };
  }, []);

  return status;
}
