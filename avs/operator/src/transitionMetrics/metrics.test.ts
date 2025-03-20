import { describe, expect, it } from "@jest/globals";
import { VectorPair } from "../types";
import cosine from "./cosine";
import hellingerDistance from "./hellinger";
import wassersteinDistance from "./wasserstein";
import computeTransitionDelta, { CompositeMetricConfig } from "./index";

describe("Distance Metrics", () => {
  describe("Wasserstein Distance", () => {
    it("should calculate correct distance for identical distributions", () => {
      const p: [number, number][] = [
        [1, 0.5],
        [2, 0.5],
      ];
      const q: [number, number][] = [
        [1, 0.5],
        [2, 0.5],
      ];
      const vp: VectorPair<number> = [p, q];

      expect(wassersteinDistance(vp)).toBe(0);
    });

    it("should calculate correct distance for completely different distributions", () => {
      const p: [number, number][] = [
        [0, 10000],
        [10, 17000],
        [20, 31000],
        [30, 19500],
        [40, 13700],
      ];
      const q: [number, number][] = [
        [0, 14900],
        [10, 32750],
        [20, 22000],
        [30, 12100],
        [40, 7500],
      ];
      const vp: VectorPair<number> = [p, q];

      const distance = wassersteinDistance(vp);
      expect(distance).toBeCloseTo(2090.0, 1);
    });

    it("should return 0 for identical distributions", () => {
      const dist: VectorPair<number> = [
        [
          [1, 0.5],
          [2, 0.5],
        ],
        [
          [1, 0.5],
          [2, 0.5],
        ],
      ];
      expect(wassersteinDistance(dist)).toBeCloseTo(0, 5);
    });

    it("should be symmetric", () => {
      const dist1: VectorPair<number> = [
        [
          [1, 0.3],
          [2, 0.7],
        ],
        [
          [1, 0.7],
          [2, 0.3],
        ],
      ];
      const dist2: VectorPair<number> = [
        [
          [1, 0.7],
          [2, 0.3],
        ],
        [
          [1, 0.3],
          [2, 0.7],
        ],
      ];
      expect(wassersteinDistance(dist1)).toBeCloseTo(
        wassersteinDistance(dist2),
        5
      );
    });

    it("should handle these cases", () => {
      const cases = [
        // Case 1: Concentrated Liquidity Around Market Price
        // Two similar distributions with slight differences in concentration
        // Expected Wasserstein distance
        {
          value: 2854.99,
          vp: [
            [
              [10, 1500],
              [20, 2000],
              [30, 3000],
              [40, 5000],
              [50, 8000],
              [60, 15000],
              [70, 25000],
              [80, 42000],
              [90, 65000],
              [100, 85000],
              [110, 95000],
              [120, 82000],
              [130, 60000],
              [140, 38000],
              [150, 24000],
              [160, 12000],
              [170, 7000],
              [180, 4000],
              [190, 2000],
              [200, 1000],
            ],
            [
              [10, 1800],
              [20, 2500],
              [30, 3500],
              [40, 6000],
              [50, 10000],
              [60, 18000],
              [70, 30000],
              [80, 50000],
              [90, 78000],
              [100, 95000],
              [110, 92000],
              [120, 75000],
              [130, 55000],
              [140, 35000],
              [150, 20000],
              [160, 10000],
              [170, 6000],
              [180, 3500],
              [190, 1800],
              [200, 900],
            ],
          ],
        },

        // Case 2: Stablecoin Pair (USDC-USDT)
        // Extremely tight liquidity distribution
        // Expected Wasserstein distance
        {
          value: 36500.0,
          vp: [
            [
              [10, 250000],
              [20, 300000],
              [30, 450000],
              [40, 650000],
              [50, 800000],
              [60, 950000],
              [70, 1200000],
              [80, 1500000],
              [90, 1800000],
              [100, 2000000],
              [110, 1800000],
              [120, 1500000],
              [130, 1200000],
              [140, 950000],
              [150, 800000],
              [160, 650000],
              [170, 450000],
              [180, 300000],
              [190, 250000],
              [200, 200000],
            ],
            [
              [10, 220000],
              [20, 280000],
              [30, 420000],
              [40, 620000],
              [50, 780000],
              [60, 920000],
              [70, 1150000],
              [80, 1450000],
              [90, 1750000],
              [100, 2100000],
              [110, 1850000],
              [120, 1550000],
              [130, 1250000],
              [140, 980000],
              [150, 830000],
              [160, 680000],
              [170, 470000],
              [180, 320000],
              [190, 270000],
              [200, 220000],
            ],
          ],
        },

        // Case 3: BTC-ETH Pair
        // Wider liquidity distribution
        // Expected Wasserstein distance
        {
          value: 2275,
          vp: [
            [
              [10, 5000],
              [20, 8000],
              [30, 12000],
              [40, 18000],
              [50, 25000],
              [60, 35000],
              [70, 48000],
              [80, 65000],
              [90, 75000],
              [100, 80000],
              [110, 75000],
              [120, 65000],
              [130, 48000],
              [140, 35000],
              [150, 25000],
              [160, 18000],
              [170, 12000],
              [180, 8000],
              [190, 5000],
              [200, 3000],
            ],
            [
              [10, 4000],
              [20, 7000],
              [30, 11000],
              [40, 16000],
              [50, 22000],
              [60, 32000],
              [70, 45000],
              [80, 62000],
              [90, 78000],
              [100, 85000],
              [110, 78000],
              [120, 62000],
              [130, 45000],
              [140, 32000],
              [150, 22000],
              [160, 16000],
              [170, 11000],
              [180, 7000],
              [190, 4000],
              [200, 2500],
            ],
          ],
        },

        // Case 4: ETH-USDC High Volatility Scenario
        // Wider spread during volatile market
        // Expected Wasserstein distance
        {
          value: 4850,
          vp: [
            [
              [10, 10000],
              [20, 15000],
              [30, 22000],
              [40, 30000],
              [50, 45000],
              [60, 65000],
              [70, 90000],
              [80, 120000],
              [90, 150000],
              [100, 180000],
              [110, 150000],
              [120, 120000],
              [130, 90000],
              [140, 65000],
              [150, 45000],
              [160, 30000],
              [170, 22000],
              [180, 15000],
              [190, 10000],
              [200, 7000],
            ],
            [
              [10, 8000],
              [20, 12000],
              [30, 18000],
              [40, 25000],
              [50, 35000],
              [60, 50000],
              [70, 70000],
              [80, 95000],
              [90, 125000],
              [100, 160000],
              [110, 190000],
              [120, 160000],
              [130, 125000],
              [140, 95000],
              [150, 70000],
              [160, 50000],
              [170, 35000],
              [180, 25000],
              [190, 18000],
              [200, 12000],
            ],
          ],
        },

        // Case 5: Long-tail Altcoin Distribution
        // Expected Wasserstein distance
        {
          value: 3765,
          vp: [
            [
              [10, 1000],
              [20, 2000],
              [30, 4000],
              [40, 8000],
              [50, 15000],
              [60, 25000],
              [70, 40000],
              [80, 60000],
              [90, 80000],
              [100, 100000],
              [110, 80000],
              [120, 60000],
              [130, 40000],
              [140, 25000],
              [150, 15000],
              [160, 8000],
              [170, 4000],
              [180, 2000],
              [190, 1000],
              [200, 500],
            ],
            [
              [10, 800],
              [20, 1500],
              [30, 3000],
              [40, 6000],
              [50, 12000],
              [60, 20000],
              [70, 32000],
              [80, 48000],
              [90, 65000],
              [100, 85000],
              [110, 100000],
              [120, 85000],
              [130, 65000],
              [140, 48000],
              [150, 32000],
              [160, 20000],
              [170, 12000],
              [180, 6000],
              [190, 3000],
              [200, 1500],
            ],
          ],
        },

        // Case 6: Uniswap V3-style Concentrated Liquidity
        // Expected Wasserstein distance
        {
          value: 25970,
          vp: [
            [
              [10, 500],
              [20, 1000],
              [30, 2000],
              [40, 4000],
              [50, 8000],
              [60, 15000],
              [70, 45000],
              [80, 120000],
              [90, 250000],
              [100, 400000],
              [110, 250000],
              [120, 120000],
              [130, 45000],
              [140, 15000],
              [150, 8000],
              [160, 4000],
              [170, 2000],
              [180, 1000],
              [190, 500],
              [200, 200],
            ],
            [
              [10, 400],
              [20, 800],
              [30, 1800],
              [40, 3500],
              [50, 7000],
              [60, 12000],
              [70, 35000],
              [80, 90000],
              [90, 180000],
              [100, 350000],
              [110, 450000],
              [120, 350000],
              [130, 180000],
              [140, 90000],
              [150, 35000],
              [160, 12000],
              [170, 7000],
              [180, 3500],
              [190, 1800],
              [200, 800],
            ],
          ],
        },

        // Case 7: Large Cap Token with Deep Liquidity
        // Expected Wasserstein distance
        {
          value: 62500,
          vp: [
            [
              [10, 50000],
              [20, 75000],
              [30, 100000],
              [40, 150000],
              [50, 200000],
              [60, 300000],
              [70, 450000],
              [80, 650000],
              [90, 900000],
              [100, 1200000],
              [110, 900000],
              [120, 650000],
              [130, 450000],
              [140, 300000],
              [150, 200000],
              [160, 150000],
              [170, 100000],
              [180, 75000],
              [190, 50000],
              [200, 30000],
            ],
            [
              [10, 40000],
              [20, 60000],
              [30, 85000],
              [40, 120000],
              [50, 170000],
              [60, 250000],
              [70, 380000],
              [80, 550000],
              [90, 780000],
              [100, 1050000],
              [110, 1300000],
              [120, 1050000],
              [130, 780000],
              [140, 550000],
              [150, 380000],
              [160, 250000],
              [170, 170000],
              [180, 120000],
              [190, 85000],
              [200, 60000],
            ],
          ],
        },

        // Case 8: Algorithmic Stablecoin De-peg Scenario
        {
          value: 13000,
          vp: [
            [
              [10, 20000],
              [20, 35000],
              [30, 60000],
              [40, 100000],
              [50, 150000],
              [60, 220000],
              [70, 300000],
              [80, 380000],
              [90, 450000],
              [100, 500000],
              [110, 450000],
              [120, 380000],
              [130, 300000],
              [140, 220000],
              [150, 150000],
              [160, 100000],
              [170, 60000],
              [180, 35000],
              [190, 20000],
              [200, 10000],
            ],
            [
              [10, 5000],
              [20, 10000],
              [30, 20000],
              [40, 35000],
              [50, 60000],
              [60, 90000],
              [70, 130000],
              [80, 180000],
              [90, 240000],
              [100, 300000],
              [110, 380000],
              [120, 450000],
              [130, 500000],
              [140, 450000],
              [150, 380000],
              [160, 300000],
              [170, 240000],
              [180, 180000],
              [190, 130000],
              [200, 90000],
            ],
          ],
        },

        // Case 9: Multi-Modal Liquidity Distribution
        // Expected Wasserstein distance
        {
          value: 29725,
          vp: [
            [
              [10, 15000],
              [20, 30000],
              [30, 60000],
              [40, 100000],
              [50, 150000],
              [60, 80000],
              [70, 40000],
              [80, 20000],
              [90, 40000],
              [100, 80000],
              [110, 150000],
              [120, 100000],
              [130, 60000],
              [140, 30000],
              [150, 15000],
              [160, 8000],
              [170, 4000],
              [180, 2000],
              [190, 1000],
              [200, 500],
            ],
            [
              [10, 10000],
              [20, 20000],
              [30, 40000],
              [40, 70000],
              [50, 120000],
              [60, 180000],
              [70, 150000],
              [80, 100000],
              [90, 70000],
              [100, 40000],
              [110, 20000],
              [120, 10000],
              [130, 20000],
              [140, 40000],
              [150, 70000],
              [160, 100000],
              [170, 150000],
              [180, 180000],
              [190, 120000],
              [200, 70000],
            ],
          ],
        },

        // Case 10: AMM Pool with Impermanent Loss Effects
        {
          value: 0,
          vp: [
            [
              [10, 5000],
              [20, 10000],
              [30, 20000],
              [40, 35000],
              [50, 60000],
              [60, 100000],
              [70, 150000],
              [80, 200000],
              [90, 250000],
              [100, 300000],
              [110, 250000],
              [120, 200000],
              [130, 150000],
              [140, 100000],
              [150, 60000],
              [160, 35000],
              [170, 20000],
              [180, 10000],
              [190, 5000],
              [200, 2500],
            ],
            [
              [10, 2500],
              [20, 5000],
              [30, 10000],
              [40, 20000],
              [50, 35000],
              [60, 60000],
              [70, 100000],
              [80, 150000],
              [90, 200000],
              [100, 250000],
              [110, 300000],
              [120, 250000],
              [130, 200000],
              [140, 150000],
              [150, 100000],
              [160, 60000],
              [170, 35000],
              [180, 20000],
              [190, 10000],
              [200, 5000],
            ],
          ],
        },
      ] as {
        value: number;
        vp: VectorPair<number>;
      }[];

      cases.forEach(({ value, vp }) => {
        const distance = wassersteinDistance(vp);
        expect(distance).toBeCloseTo(value, 1);
      });
    });
  });

  describe("Cosine Similarity", () => {
    it("should return 1 for identical distributions", () => {
      const p: [number, number][] = [
        [0, 1],
        [1, 1],
      ];
      const q: [number, number][] = [
        [0, 1],
        [1, 1],
      ];
      const vp: VectorPair<number> = [p, q];

      expect(cosine(vp)).toBeCloseTo(1, 10);
    });

    it("should return 0 for orthogonal distributions", () => {
      const p: [number, number][] = [
        [0, 1],
        [1, 0],
      ];
      const q: [number, number][] = [
        [0, 0],
        [1, 1],
      ];
      const vp: VectorPair<number> = [p, q];

      expect(cosine(vp)).toBe(0);
    });

    it("should return 1 for identical distributions", () => {
      const dist: VectorPair<number> = [
        [
          [1, 0.5],
          [2, 0.5],
        ],
        [
          [1, 0.5],
          [2, 0.5],
        ],
      ];
      expect(cosine(dist)).toBeCloseTo(1, 5);
    });

    it("should handle orthogonal vectors", () => {
      const dist: VectorPair<number> = [
        [
          [1, 1],
          [2, 0],
        ],
        [
          [1, 0],
          [2, 1],
        ],
      ];
      expect(cosine(dist)).toBeCloseTo(0, 5);
    });
  });

  describe("Hellinger Distance", () => {
    it("should return 0 for identical distributions", () => {
      const p: [number, number][] = [
        [1, 0.5],
        [2, 0.5],
      ];
      const q: [number, number][] = [
        [1, 0.5],
        [2, 0.5],
      ];
      const vp: VectorPair<number> = [p, q];

      expect(hellingerDistance(vp)).toBe(0);
    });

    it("should return 1 for completely different distributions", () => {
      const p: [number, number][] = [
        [1, 1],
        [2, 0],
      ];
      const q: [number, number][] = [
        [1, 0],
        [2, 1],
      ];
      const vp: VectorPair<number> = [p, q];

      expect(hellingerDistance(vp)).toBeCloseTo(1, 5);
    });

    it("should handle uneven mass distributions", () => {
      const p: [number, number][] = [
        [1, 0.3],
        [2, 0.7],
      ];
      const q: [number, number][] = [
        [1, 0.7],
        [2, 0.3],
      ];
      const vp: VectorPair<number> = [p, q];

      const distance = hellingerDistance(vp);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1);
    });

    it("should return 0 for identical distributions", () => {
      const dist: VectorPair<number> = [
        [
          [1, 0.5],
          [2, 0.5],
        ],
        [
          [1, 0.5],
          [2, 0.5],
        ],
      ];
      expect(hellingerDistance(dist)).toBeCloseTo(0, 5);
    });

    it("should be symmetric", () => {
      const dist1: VectorPair<number> = [
        [
          [1, 0.3],
          [2, 0.7],
        ],
        [
          [1, 0.7],
          [2, 0.3],
        ],
      ];
      const dist2: VectorPair<number> = [
        [
          [1, 0.7],
          [2, 0.3],
        ],
        [
          [1, 0.3],
          [2, 0.7],
        ],
      ];
      expect(hellingerDistance(dist1)).toBeCloseTo(hellingerDistance(dist2), 5);
    });
  });

  describe("Transition Delta", () => {
    it("should return 0 for identical distributions", () => {
      const p: [number, number][] = [
        [1, 0.5],
        [2, 0.5],
      ];
      const q: [number, number][] = [
        [1, 0.5],
        [2, 0.5],
      ];
      const vp: VectorPair<number> = [p, q];

      expect(computeTransitionDelta(vp)).toBeCloseTo(0);
    });

    it("should return higher values for more dissimilar distributions", () => {
      const p: [number, number][] = [
        [1, 2],
        [2, 0],
      ];
      const q: [number, number][] = [
        [1, 0],
        [2, 2],
      ];
      const vp: VectorPair<number> = [p, q];

      expect(computeTransitionDelta(vp)).toBeGreaterThan(0.44);
    });

    it("should respect custom weights", () => {
      const p: [number, number][] = [
        [1, 0.3],
        [2, 0.7],
      ];
      const q: [number, number][] = [
        [1, 0.7],
        [2, 0.3],
      ];
      const vp: VectorPair<number> = [p, q];

      const config: CompositeMetricConfig = {
        wassersteinWeight: 0.2,
        hellingerWeight: 0.6,
        cosineWeight: 0.2,
      };

      const defaultDelta = computeTransitionDelta(vp);
      const customDelta = computeTransitionDelta(vp, config);

      expect(defaultDelta).not.toBe(customDelta);
    });

    it("should handle dynamic min-max scaling for Wasserstein distance", () => {
      const p: [number, number][] = [
        [1, 100],
        [2, 200],
      ];
      const q: [number, number][] = [
        [1, 150],
        [2, 250],
      ];
      const vp: VectorPair<number> = [p, q];

      const delta = computeTransitionDelta(vp);
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThan(1);

      // Test with larger values to ensure scaling works
      const largeP: [number, number][] = [
        [1, 10000],
        [2, 20000],
      ];
      const largeQ: [number, number][] = [
        [1, 15000],
        [2, 25000],
      ];
      const largeVP: VectorPair<number> = [largeP, largeQ];

      const largeDelta = computeTransitionDelta(largeVP);
      // The normalized result should be similar despite different scales
      expect(largeDelta).toBeCloseTo(delta, 1);
    });

    it("should be symmetric", () => {
      const dist1: VectorPair<number> = [
        [
          [1, 0.3],
          [2, 0.7],
        ],
        [
          [1, 0.7],
          [2, 0.3],
        ],
      ];
      const dist2: VectorPair<number> = [
        [
          [1, 0.7],
          [2, 0.3],
        ],
        [
          [1, 0.3],
          [2, 0.7],
        ],
      ];
      expect(computeTransitionDelta(dist1)).toBeCloseTo(
        computeTransitionDelta(dist2),
        5
      );
    });

    it("should handle extreme value differences", () => {
      const p: [number, number][] = [
        [1, 1],
        [2, 100000],
      ];
      const q: [number, number][] = [
        [1, 100000],
        [2, 1],
      ];
      const vp: VectorPair<number> = [p, q];

      const delta = computeTransitionDelta(vp);
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThan(1);
    });

    it("should handle zero values correctly", () => {
      const p: [number, number][] = [
        [1, 0],
        [2, 100],
      ];
      const q: [number, number][] = [
        [1, 100],
        [2, 0],
      ];
      const vp: VectorPair<number> = [p, q];

      const delta = computeTransitionDelta(vp);
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThan(1);
    });
  });
});
