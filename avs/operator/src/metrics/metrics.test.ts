import { describe, it, expect } from "@jest/globals";
import wassersteinDistance from "../wasserstein";
import cosine from "./cosine";
import hellingerDistance from "./hellinger";
import { VectorPair } from "../types";

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
        [1, 1],
        [3, 0],
      ];
      const q: [number, number][] = [
        [1, 0],
        [3, 1],
      ];
      const vp: VectorPair<number> = [p, q];

      const distance = wassersteinDistance(vp);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThanOrEqual(1);
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
});
