import { describe, it, expect } from "vitest";
import { applyRadialDistortion, getCellIndex } from "@/lib/grid-math";

describe("applyRadialDistortion", () => {
  it("returns the point unchanged at the screen center", () => {
    const res = applyRadialDistortion(
      { x: 400, y: 300 },  // point == center
      { x: 400, y: 300 },  // center
      0.4,                  // strength
      150                   // radius
    );
    expect(res.x).toBeCloseTo(400);
    expect(res.y).toBeCloseTo(300);
  });

  it("leaves points outside the radius unchanged", () => {
    const center = { x: 400, y: 300 };
    const point  = { x: 600, y: 300 }; // 200px right, beyond radius 150
    const res = applyRadialDistortion(point, center, 0.4, 150);
    expect(res.x).toBeCloseTo(600);
    expect(res.y).toBeCloseTo(300);
  });

  it("pushes points inside the radius outward from center (inverted fisheye)", () => {
    const center = { x: 400, y: 300 };
    const point  = { x: 450, y: 300 }; // 50px right, inside radius 150
    const res = applyRadialDistortion(point, center, 0.4, 150);
    expect(res.x).toBeGreaterThan(450);
  });
});

describe("getCellIndex", () => {
  it("returns index 0 for world origin with no offset", () => {
    const idx = getCellIndex({ x: 0, y: 0 }, { x: 0, y: 0 }, 200, 25);
    expect(idx).toBe(0);
  });

  it("wraps index within [0, count)", () => {
    const idx = getCellIndex({ x: 1000, y: 800 }, { x: 0, y: 0 }, 200, 25);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(25);
  });

  it("is deterministic for the same inputs", () => {
    const a = getCellIndex({ x: 340, y: 220 }, { x: 10, y: 20 }, 200, 25);
    const b = getCellIndex({ x: 340, y: 220 }, { x: 10, y: 20 }, 200, 25);
    expect(a).toBe(b);
  });
});
