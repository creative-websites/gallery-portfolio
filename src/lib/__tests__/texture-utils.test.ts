import { describe, it, expect } from "vitest";
import { packAtlasLayout } from "@/lib/texture-utils";

describe("packAtlasLayout", () => {
  it("computes correct tile count for 25 items", () => {
    const layout = packAtlasLayout(25, 256);
    expect(layout.cols).toBe(5);
    expect(layout.tileSize).toBe(256);
    expect(layout.atlasSize).toBe(5 * 256);
  });

  it("rounds cols up to next integer for non-square counts", () => {
    const layout = packAtlasLayout(10, 128);
    expect(layout.cols).toBe(4); // ceil(sqrt(10)) = 4
  });

  it("handles single item", () => {
    const layout = packAtlasLayout(1, 512);
    expect(layout.cols).toBe(1);
    expect(layout.atlasSize).toBe(512);
  });

  it("handles exactly square counts", () => {
    const layout = packAtlasLayout(16, 256);
    expect(layout.cols).toBe(4);
    expect(layout.atlasSize).toBe(1024);
  });
});
