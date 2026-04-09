import { describe, it, expect, vi, beforeAll } from "vitest";

beforeAll(() => {
  const ctx = {
    fillStyle: "",
    font: "",
    textBaseline: "",
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    drawImage: vi.fn(),
  };
  vi.stubGlobal("document", {
    createElement: vi.fn().mockReturnValue({
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(ctx),
    }),
  });
});

import { packAtlasLayout, createTextTexture } from "@/lib/texture-utils";

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
});

describe("createTextTexture", () => {
  it("returns an object (canvas element)", () => {
    const result = createTextTexture("My Project", 2024, 512, 64);
    expect(result).toBeDefined();
  });
});
