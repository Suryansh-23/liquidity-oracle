import { useMemo, useState } from "react";
import { useModifyLiquidity } from "../lib/contract";
import { sanitizeTickRange } from "../lib/utils";
import { LiquidityVisualizer } from "./LiquidityVisualizer";

interface LiquidityDialogProps {
  onSubmit: (
    lowerTick: number,
    upperTick: number,
    liquidityDelta: string
  ) => void;
}

const MIN_TICK = -11000;
const MAX_TICK = 11000;
const TICK_SPACING = 10; // Using the same default as in simulator

export function LiquidityDialog({ onSubmit }: LiquidityDialogProps) {
  const [lowerTick, setLowerTick] = useState<number>(-6969);
  const [upperTick, setUpperTick] = useState<number>(6969);
  const [liquidityDelta, setLiquidityDelta] = useState<string>("420000000");
  const [error, setError] = useState<string | null>(null);

  // Contract interaction hook
  const {
    modifyLiquidity,
    isLoading,
    isSuccess,
    error: contractError,
    hash,
  } = useModifyLiquidity();

  // Memoize validation state to avoid recalculating on every render
  const isValid = useMemo(() => {
    // Check all constraints
    const isLowerTickValid = lowerTick >= MIN_TICK && lowerTick <= MAX_TICK;
    const isUpperTickValid = upperTick >= MIN_TICK && upperTick <= MAX_TICK;
    const isTickOrderValid = upperTick > lowerTick;
    const isLiquidityValid =
      liquidityDelta.length > 0 && !isNaN(Number(liquidityDelta));

    return (
      isLowerTickValid &&
      isUpperTickValid &&
      isTickOrderValid &&
      isLiquidityValid
    );
  }, [lowerTick, upperTick, liquidityDelta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lowerTick < MIN_TICK || lowerTick > MAX_TICK) {
      setError("Lower tick must be between -11,000 and 11,000");
      return;
    }

    if (upperTick < MIN_TICK || upperTick > MAX_TICK) {
      setError("Upper tick must be between -11,000 and 11,000");
      return;
    }

    if (upperTick <= lowerTick) {
      setError("Upper tick must be greater than lower tick");
      return;
    }

    try {
      // Sanitize tick range
      const [sanitizedLower, sanitizedUpper] = sanitizeTickRange(
        lowerTick,
        upperTick,
        TICK_SPACING
      );

      // Convert liquidityDelta to bigint
      const liquidityDeltaBigInt = BigInt(liquidityDelta);

      // Call the contract with the correct parameter structure
      await modifyLiquidity([
        sanitizedLower,
        sanitizedUpper,
        liquidityDeltaBigInt,
      ]);

      // Call the onSubmit callback
      onSubmit(sanitizedLower, sanitizedUpper, liquidityDelta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleTickChange = (lower: number, upper: number) => {
    // Ensure values are within bounds
    const clampedLower = Math.max(MIN_TICK, Math.min(MAX_TICK, lower));
    const clampedUpper = Math.max(MIN_TICK, Math.min(MAX_TICK, upper));

    if (clampedUpper > clampedLower) {
      setLowerTick(clampedLower);
      setUpperTick(clampedUpper);
      setError(null);
    }
  };

  const handleLowerTickChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);

    // Allow any valid number input, we'll validate on blur
    if (!isNaN(newValue)) {
      setLowerTick(newValue);
      setError(null);
    }
  };

  const handleUpperTickChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);

    // Allow any valid number input, we'll validate on blur
    if (!isNaN(newValue)) {
      setUpperTick(newValue);
      setError(null);
    }
  };

  const handleLowerTickBlur = () => {
    // On blur, validate and clamp the value
    let newValue = Math.max(MIN_TICK, Math.min(MAX_TICK, lowerTick));

    if (newValue >= upperTick) {
      setError("Lower tick must be less than upper tick");
    } else {
      setError(null);
    }

    setLowerTick(newValue);
  };

  const handleUpperTickBlur = () => {
    // On blur, validate and clamp the value
    let newValue = Math.max(MIN_TICK, Math.min(MAX_TICK, upperTick));

    if (newValue <= lowerTick) {
      setError("Upper tick must be greater than lower tick");
    } else {
      setError(null);
    }

    setUpperTick(newValue);
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
            min={MIN_TICK}
            max={upperTick - 1}
            value={lowerTick}
            onChange={handleLowerTickChange}
            onBlur={handleLowerTickBlur}
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
            min={lowerTick + 1}
            max={MAX_TICK}
            value={upperTick}
            onChange={handleUpperTickChange}
            onBlur={handleUpperTickBlur}
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
            onChange={(e) => {
              setLiquidityDelta(e.target.value);
              if (!e.target.value) {
                setError("Liquidity Delta is required");
              } else if (isNaN(Number(e.target.value))) {
                setError("Liquidity Delta must be a valid number");
              } else {
                setError(null);
              }
            }}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 px-4 py-2"
            placeholder="Enter liquidity amount..."
          />
        </div>

        {(error || contractError) && (
          <div className="text-red-400 text-sm mt-2">
            {error ||
              (contractError instanceof Error
                ? contractError.message
                : "Contract error occurred")}
          </div>
        )}

        {isSuccess && hash && (
          <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
            <p className="text-sm text-green-600 mb-1">
              Transaction successful!
            </p>
            <div className="break-all font-mono text-sm text-green-700 bg-green-100 p-2 rounded">
              {hash}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!isValid || isLoading || error !== null}
          className="w-full bg-indigo-600 text-white rounded-md px-4 py-2 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800 mt-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
        >
          {isLoading ? "Modifying..." : "Modify Liquidity"}
        </button>
      </form>
    </div>
  );
}
