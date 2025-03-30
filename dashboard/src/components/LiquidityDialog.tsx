import { useState } from "react";
import { LiquidityVisualizer } from "./LiquidityVisualizer";

interface LiquidityDialogProps {
  onSubmit: (
    lowerTick: number,
    upperTick: number,
    liquidityDelta: string
  ) => void;
}

export function LiquidityDialog({ onSubmit }: LiquidityDialogProps) {
  const [lowerTick, setLowerTick] = useState<number>(0);
  const [upperTick, setUpperTick] = useState<number>(0);
  const [liquidityDelta, setLiquidityDelta] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lowerTick < -11000 || lowerTick > 11000) {
      setError("Lower tick must be between -11,000 and 11,000");
      return;
    }

    if (upperTick < -11000 || upperTick > 11000) {
      setError("Upper tick must be between -11,000 and 11,000");
      return;
    }

    if (upperTick <= lowerTick) {
      setError("Upper tick must be greater than lower tick");
      return;
    }

    onSubmit(lowerTick, upperTick, liquidityDelta);
  };

  const handleTickChange = (lower: number, upper: number) => {
    setLowerTick(lower);
    setUpperTick(upper);
    setError(null);
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md sticky top-6">
      <h2 className="text-xl font-bold text-gray-100 mb-6">Modify Liquidity</h2>

      <LiquidityVisualizer
        lowerTick={lowerTick}
        upperTick={upperTick}
        onTickChange={handleTickChange}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="lowerTick"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Lower Tick
          </label>
          <input
            type="number"
            id="lowerTick"
            min={-11000}
            max={11000}
            value={lowerTick}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value <= upperTick) {
                setLowerTick(value);
                setError(null);
              }
            }}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="upperTick"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Upper Tick
          </label>
          <input
            type="number"
            id="upperTick"
            min={-11000}
            max={11000}
            value={upperTick}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value >= lowerTick) {
                setUpperTick(value);
                setError(null);
              }
            }}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2"
          />
        </div>

        <div>
          <label
            htmlFor="liquidityDelta"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            Liquidity Delta
          </label>
          <input
            type="text"
            id="liquidityDelta"
            value={liquidityDelta}
            onChange={(e) => setLiquidityDelta(e.target.value)}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2"
            placeholder="Enter liquidity amount..."
          />
        </div>

        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white rounded-md px-4 py-2 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 mt-6"
        >
          Modify Liquidity
        </button>
      </form>
    </div>
  );
}
