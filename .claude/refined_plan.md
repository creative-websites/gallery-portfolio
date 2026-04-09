# Gallery — Next.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-screen infinite draggable project gallery with GPU-driven fisheye distortion, rendered via Three.js shaders inside a Next.js App Router application.

**Architecture:** A single `GalleryCanvas` client component owns the Three.js lifecycle (scene, camera, renderer, animation loop, event listeners) via `useRef`/`useEffect`. All shader logic lives in a plain `shaders.ts` module; texture utilities in `texture-utils.ts`; scene orchestration in `gallery-scene.ts`. Project data drives both the gallery grid and dynamic `[slug]` routes.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Three.js, GLSL (inline strings), IBM Plex Mono via `next/font/google`, CSS Modules for vignette/cursor overlay.

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/app/layout.tsx` | Root layout: applies IBM Plex Mono, global reset CSS |
| `src/app/page.tsx` | Home — renders `<GalleryCanvas />` full-screen |
| `src/app/projects/[slug]/page.tsx` | Dynamic project detail page |
| `src/app/globals.css` | CSS reset, body `margin:0`, `overflow:hidden` |
| `src/components/GalleryCanvas.tsx` | `"use client"` — mounts canvas, wires resize + pointer events, runs animation loop |
| `src/components/GalleryCanvas.module.css` | Vignette overlay, cursor states, canvas wrapper |
| `src/lib/data.ts` | `Project[]` array: `{ title, slug, imagePath, year }` |
| `src/lib/shaders.ts` | `vertexShader` and `fragmentShader` GLSL strings |
| `src/lib/texture-utils.ts` | `createTextTexture`, `createTextureAtlas`, `loadImageTextures` |
| `src/lib/gallery-scene.ts` | Class `GalleryScene`: init, resize, pointer handling, animate, dispose |
| `src/lib/grid-math.ts` | Pure functions: `screenToGrid`, `applyRadialDistortion`, `getCellIndex` |
| `public/images/` | 25 project images (`01.jpg` … `25.jpg`) |

---

## Task 1: Project Scaffold

**Files:**
- Create: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Bootstrap Next.js project**

```bash
npx create-next-app@latest . \
  --typescript --app --no-tailwind \
  --src-dir --import-alias "@/*" \
  --eslint
npm install three @types/three
```

- [ ] **Step 2: Run dev server to confirm it starts**

```bash
npm run dev
```
Expected: "Ready" on `http://localhost:3000` with no errors.

- [ ] **Step 3: Write global CSS reset**

Replace `src/app/globals.css`:

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0a0a0a;
}
```

- [ ] **Step 4: Wire IBM Plex Mono font in layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Gallery",
  description: "Project gallery",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ibmPlexMono.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Make home page full-screen placeholder**

Replace `src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      {/* GalleryCanvas will go here */}
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with IBM Plex Mono and CSS reset"
```

---

## Task 2: Project Data

**Files:**
- Create: `src/lib/data.ts`
- Create: `src/app/projects/[slug]/page.tsx`

- [ ] **Step 1: Write the data module**

Create `src/lib/data.ts`:

```ts
export interface Project {
  title: string;
  slug: string;
  imagePath: string;
  year: number;
}

export const projects: Project[] = [
  { title: "Project One",          slug: "project-one",          imagePath: "/images/01.jpg", year: 2024 },
  { title: "Project Two",          slug: "project-two",          imagePath: "/images/02.jpg", year: 2024 },
  { title: "Project Three",        slug: "project-three",        imagePath: "/images/03.jpg", year: 2023 },
  { title: "Project Four",         slug: "project-four",         imagePath: "/images/04.jpg", year: 2023 },
  { title: "Project Five",         slug: "project-five",         imagePath: "/images/05.jpg", year: 2023 },
  { title: "Project Six",          slug: "project-six",          imagePath: "/images/06.jpg", year: 2023 },
  { title: "Project Seven",        slug: "project-seven",        imagePath: "/images/07.jpg", year: 2022 },
  { title: "Project Eight",        slug: "project-eight",        imagePath: "/images/08.jpg", year: 2022 },
  { title: "Project Nine",         slug: "project-nine",         imagePath: "/images/09.jpg", year: 2022 },
  { title: "Project Ten",          slug: "project-ten",          imagePath: "/images/10.jpg", year: 2022 },
  { title: "Project Eleven",       slug: "project-eleven",       imagePath: "/images/11.jpg", year: 2022 },
  { title: "Project Twelve",       slug: "project-twelve",       imagePath: "/images/12.jpg", year: 2021 },
  { title: "Project Thirteen",     slug: "project-thirteen",     imagePath: "/images/13.jpg", year: 2021 },
  { title: "Project Fourteen",     slug: "project-fourteen",     imagePath: "/images/14.jpg", year: 2021 },
  { title: "Project Fifteen",      slug: "project-fifteen",      imagePath: "/images/15.jpg", year: 2021 },
  { title: "Project Sixteen",      slug: "project-sixteen",      imagePath: "/images/16.jpg", year: 2021 },
  { title: "Project Seventeen",    slug: "project-seventeen",    imagePath: "/images/17.jpg", year: 2020 },
  { title: "Project Eighteen",     slug: "project-eighteen",     imagePath: "/images/18.jpg", year: 2020 },
  { title: "Project Nineteen",     slug: "project-nineteen",     imagePath: "/images/19.jpg", year: 2020 },
  { title: "Project Twenty",       slug: "project-twenty",       imagePath: "/images/20.jpg", year: 2020 },
  { title: "Project Twenty-One",   slug: "project-twenty-one",   imagePath: "/images/21.jpg", year: 2020 },
  { title: "Project Twenty-Two",   slug: "project-twenty-two",   imagePath: "/images/22.jpg", year: 2019 },
  { title: "Project Twenty-Three", slug: "project-twenty-three", imagePath: "/images/23.jpg", year: 2019 },
  { title: "Project Twenty-Four",  slug: "project-twenty-four",  imagePath: "/images/24.jpg", year: 2019 },
  { title: "Project Twenty-Five",  slug: "project-twenty-five",  imagePath: "/images/25.jpg", year: 2019 },
];
```

- [ ] **Step 2: Write the dynamic project page**

Create `src/app/projects/[slug]/page.tsx`:

```tsx
import { projects } from "@/lib/data";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <main style={{ padding: "2rem", fontFamily: "var(--font-mono)", color: "#f0f0f0" }}>
      <a href="/" style={{ color: "#888", textDecoration: "none", fontSize: "0.85rem" }}>
        ← Back
      </a>
      <h1 style={{ marginTop: "2rem", fontSize: "2rem" }}>{project.title}</h1>
      <p style={{ color: "#666", marginTop: "0.5rem" }}>{project.year}</p>
    </main>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data.ts src/app/projects/
git commit -m "feat: add project data and dynamic project route"
```

---

## Task 3: Grid Math Utilities (with tests)

**Files:**
- Create: `src/lib/grid-math.ts`
- Create: `src/lib/__tests__/grid-math.test.ts`

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest @vitejs/plugin-react
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

- [ ] **Step 2: Write failing tests for grid math**

Create `src/lib/__tests__/grid-math.test.ts`:

```ts
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

  it("pushes points outside the radius outward (dx grows)", () => {
    const center = { x: 400, y: 300 };
    const point  = { x: 600, y: 300 }; // 200px right, beyond radius 150
    const res = applyRadialDistortion(point, center, 0.4, 150);
    expect(res.x).toBeGreaterThan(600);
    expect(res.y).toBeCloseTo(300);
  });

  it("pulls points inside the radius inward toward center", () => {
    const center = { x: 400, y: 300 };
    const point  = { x: 450, y: 300 }; // 50px right, inside radius 150
    const res = applyRadialDistortion(point, center, 0.4, 150);
    expect(res.x).toBeLessThan(450);
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
```

- [ ] **Step 3: Run tests — confirm they FAIL**

```bash
npm test
```
Expected: FAIL — "Cannot find module '@/lib/grid-math'".

- [ ] **Step 4: Implement grid-math.ts**

Create `src/lib/grid-math.ts`:

```ts
export interface Vec2 { x: number; y: number }

/**
 * Applies the same inverted fisheye radial distortion used in the fragment shader,
 * but in screen/canvas space. Used to map a click position back to its
 * pre-distortion world coordinate so grid hit-testing is accurate.
 *
 * Points within `radius` of `center` are pulled inward (barrel distortion).
 * Points outside `radius` are pushed outward.
 */
export function applyRadialDistortion(
  point: Vec2,
  center: Vec2,
  strength: number,
  radius: number
): Vec2 {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return { x: point.x, y: point.y };

  const normalized = dist / radius;
  const factor = normalized < 1
    ? 1 - strength * (1 - normalized * normalized)  // inside: pull in
    : 1 + strength * (normalized - 1);               // outside: push out

  return {
    x: center.x + dx * factor,
    y: center.y + dy * factor,
  };
}

/**
 * Converts a canvas-space point (after distortion correction) to a
 * grid cell index, accounting for the current pan offset.
 *
 * The grid is infinite and tiled; index wraps within [0, count).
 */
export function getCellIndex(
  canvasPoint: Vec2,
  offset: Vec2,
  cellSize: number,
  count: number
): number {
  const worldX = canvasPoint.x - offset.x;
  const worldY = canvasPoint.y - offset.y;

  const col = Math.floor(worldX / cellSize);
  const row = Math.floor(worldY / cellSize);

  const cols = Math.ceil(Math.sqrt(count));
  const rawIndex = ((row % cols) + cols) % cols * cols + ((col % cols) + cols) % cols;

  return ((rawIndex % count) + count) % count;
}
```

- [ ] **Step 5: Run tests — confirm they PASS**

```bash
npm test
```
Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/grid-math.ts src/lib/__tests__/ vitest.config.ts package.json
git commit -m "feat: add grid-math utilities with tests (radial distortion, cell indexing)"
```

---

## Task 4: GLSL Shaders

**Files:**
- Create: `src/lib/shaders.ts`

- [ ] **Step 1: Create the shaders module**

Create `src/lib/shaders.ts`:

```ts
export const vertexShader = /* glsl */`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = /* glsl */`
  precision highp float;

  uniform vec2  uResolution;
  uniform vec2  uOffset;
  uniform vec2  uMouse;
  uniform float uZoom;

  uniform sampler2D uImageAtlas;
  uniform sampler2D uTextAtlas;

  uniform float uCellSize;
  uniform int   uCols;
  uniform int   uCount;

  uniform vec4  uBgColor;
  uniform vec4  uBorderColor;
  uniform vec4  uTextColor;
  uniform vec4  uHoverColor;

  uniform float uDistortionStrength;
  uniform float uDistortionRadius;

  varying vec2 vUv;

  vec2 applyDistortion(vec2 fragCoord, vec2 center) {
    vec2 delta = fragCoord - center;
    float dist = length(delta);
    float norm = dist / uDistortionRadius;
    float factor = norm < 1.0
      ? 1.0 - uDistortionStrength * (1.0 - norm * norm)
      : 1.0 + uDistortionStrength * (norm - 1.0);
    return center + delta * factor;
  }

  vec4 sampleAtlas(sampler2D atlas, vec2 uv, int index, int atlasSize) {
    float s = float(atlasSize);
    float col = float(index - (index / atlasSize) * atlasSize);
    float row = float(index / atlasSize);
    vec2 tileUv = (vec2(col, row) + clamp(uv, 0.0, 1.0)) / s;
    return texture2D(atlas, tileUv);
  }

  void main() {
    vec2 fragCoord = vUv * uResolution;
    vec2 center    = uResolution * 0.5;
    vec2 distorted = applyDistortion(fragCoord, center);

    vec2 world = (distorted - center) / uZoom + center - uOffset;

    vec2  cell   = floor(world / uCellSize);
    vec2  cellUv = fract(world / uCellSize);

    int cols   = uCols;
    int rawIdx = int(mod(cell.y, float(cols))) * cols
               + int(mod(cell.x, float(cols)));
    int idx    = int(mod(float(rawIdx), float(uCount)));

    float border  = 0.02;
    bool  onBorder = cellUv.x < border || cellUv.x > 1.0 - border
                  || cellUv.y < border || cellUv.y > 1.0 - border;

    vec2 mouseD = applyDistortion(uMouse, center);
    vec2 hWorld = (mouseD - center) / uZoom + center - uOffset;
    vec2 hCell  = floor(hWorld / uCellSize);
    bool hovered = (hCell == cell);

    int atlasSize = int(ceil(sqrt(float(uCount))));

    vec4 finalColor = uBgColor;
    if (onBorder) {
      finalColor = hovered ? uHoverColor : uBorderColor;
    } else if (cellUv.y > 0.78) {
      vec2 txtUv = vec2(cellUv.x, (cellUv.y - 0.78) / 0.22);
      finalColor = mix(uBgColor, sampleAtlas(uTextAtlas, txtUv, idx, atlasSize), 0.9);
      if (hovered) finalColor = mix(finalColor, uHoverColor, 0.15);
    } else {
      finalColor = sampleAtlas(uImageAtlas, cellUv, idx, atlasSize);
      if (hovered) finalColor = mix(finalColor, uHoverColor, 0.08);
    }

    gl_FragColor = finalColor;
  }
`;
```

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/shaders.ts
git commit -m "feat: add GLSL vertex and fragment shaders"
```

---

## Task 5: Texture Utilities

**Files:**
- Create: `src/lib/texture-utils.ts`
- Create: `src/lib/__tests__/texture-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/texture-utils.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — confirm FAIL**

```bash
npm test
```
Expected: FAIL — "Cannot find module '@/lib/texture-utils'".

- [ ] **Step 3: Implement texture-utils.ts**

Create `src/lib/texture-utils.ts`:

```ts
import * as THREE from "three";
import type { Project } from "./data";

export interface AtlasLayout {
  cols: number;
  tileSize: number;
  atlasSize: number;
}

export function packAtlasLayout(count: number, tileSize: number): AtlasLayout {
  const cols = Math.ceil(Math.sqrt(count));
  return { cols, tileSize, atlasSize: cols * tileSize };
}

/**
 * Draws title (left-aligned) and year (right-aligned) onto a canvas
 * used as a text label strip at the bottom of each grid cell.
 */
export function createTextTexture(
  title: string,
  year: number,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#e0e0e0";
  ctx.font = `${Math.floor(height * 0.45)}px 'IBM Plex Mono', monospace`;
  ctx.textBaseline = "middle";

  const y = height / 2;
  ctx.fillText(title, 12, y);

  const yearStr = String(year);
  const yearWidth = ctx.measureText(yearStr).width;
  ctx.fillText(yearStr, width - yearWidth - 12, y);

  return canvas;
}

function packCanvasAtlas(tiles: HTMLCanvasElement[], layout: AtlasLayout): HTMLCanvasElement {
  const { cols, tileSize, atlasSize } = layout;
  const atlas = document.createElement("canvas");
  atlas.width = atlasSize;
  atlas.height = atlasSize;
  const ctx = atlas.getContext("2d")!;

  tiles.forEach((tile, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    ctx.drawImage(tile, col * tileSize, row * tileSize, tileSize, tileSize);
  });

  return atlas;
}

function makeCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Build text label atlas from project data. Returns a THREE.CanvasTexture. */
export function createTextAtlas(
  projects: Project[],
  tileWidth: number,
  tileHeight: number
): THREE.CanvasTexture {
  const layout = packAtlasLayout(projects.length, tileWidth);
  const tiles  = projects.map((p) => createTextTexture(p.title, p.year, tileWidth, tileHeight));
  return makeCanvasTexture(packCanvasAtlas(tiles, layout));
}

/** Load project images and pack into a single THREE.CanvasTexture atlas. */
export async function loadImageAtlas(
  projects: Project[],
  tileSize: number
): Promise<THREE.CanvasTexture> {
  const loader = new THREE.TextureLoader();

  const textures = await Promise.all(
    projects.map(
      (p) =>
        new Promise<THREE.Texture>((resolve, reject) =>
          loader.load(p.imagePath, resolve, undefined, reject)
        )
    )
  );

  const layout = packAtlasLayout(projects.length, tileSize);
  const atlas  = document.createElement("canvas");
  atlas.width  = layout.atlasSize;
  atlas.height = layout.atlasSize;
  const ctx = atlas.getContext("2d")!;

  textures.forEach((tex, i) => {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    ctx.drawImage(tex.image as HTMLImageElement, col * tileSize, row * tileSize, tileSize, tileSize);
    tex.dispose();
  });

  return makeCanvasTexture(atlas);
}
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
npm test
```
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/texture-utils.ts src/lib/__tests__/texture-utils.test.ts
git commit -m "feat: add texture utilities (text labels, atlas packing, image loading)"
```

---

## Task 6: Gallery Scene Class

**Files:**
- Create: `src/lib/gallery-scene.ts`

- [ ] **Step 1: Create gallery-scene.ts**

Create `src/lib/gallery-scene.ts`:

```ts
import * as THREE from "three";
import { projects } from "./data";
import { vertexShader, fragmentShader } from "./shaders";
import { createTextAtlas, loadImageAtlas } from "./texture-utils";
import { applyRadialDistortion, getCellIndex, type Vec2 } from "./grid-math";

export interface GalleryConfig {
  cellSize: number;
  lerpFactor: number;
  zoomOut: number;
  zoomNormal: number;
  zoomDuration: number;
  distortionStrength: number;
  distortionRadius: number;
  clickMaxDuration: number;
  clickMaxMove: number;
}

const DEFAULT_CONFIG: GalleryConfig = {
  cellSize: 300,
  lerpFactor: 0.08,
  zoomOut: 0.85,
  zoomNormal: 1.0,
  zoomDuration: 100,
  distortionStrength: 0.4,
  distortionRadius: 160,
  clickMaxDuration: 200,
  clickMaxMove: 6,
};

export class GalleryScene {
  private renderer: THREE.WebGLRenderer;
  private scene:    THREE.Scene;
  private camera:   THREE.OrthographicCamera;
  private mesh:     THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;

  private offset:       Vec2 = { x: 0, y: 0 };
  private targetOffset: Vec2 = { x: 0, y: 0 };
  private zoom:         number;
  private targetZoom:   number;
  private mouse:        Vec2 = { x: -9999, y: -9999 };

  private isDragging     = false;
  private isClick        = false;
  private clickStart     = 0;
  private clickStartPos: Vec2 = { x: 0, y: 0 };
  private lastPointer:  Vec2 = { x: 0, y: 0 };
  private zoomTimer: ReturnType<typeof setTimeout> | null = null;

  private animFrameId: number | null = null;
  private cfg: GalleryConfig;
  private onNavigate: (path: string) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onNavigate: (path: string) => void,
    cfg: Partial<GalleryConfig> = {}
  ) {
    this.cfg        = { ...DEFAULT_CONFIG, ...cfg };
    this.zoom       = this.cfg.zoomNormal;
    this.targetZoom = this.cfg.zoomNormal;
    this.onNavigate = onNavigate;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene  = new THREE.Scene();
    this.camera = this.makeCamera();

    this.buildMesh();
    this.loadTextures();
  }

  private makeCamera(): THREE.OrthographicCamera {
    const { innerWidth: w, innerHeight: h } = window;
    const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 10);
    cam.position.z = 1;
    return cam;
  }

  private buildMesh(): void {
    const { innerWidth: w, innerHeight: h } = window;
    const cols = Math.ceil(Math.sqrt(projects.length));

    const geo = new THREE.PlaneGeometry(w, h);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uResolution:         { value: new THREE.Vector2(w, h) },
        uOffset:             { value: new THREE.Vector2(0, 0) },
        uMouse:              { value: new THREE.Vector2(-9999, -9999) },
        uZoom:               { value: this.zoom },
        uImageAtlas:         { value: null },
        uTextAtlas:          { value: null },
        uCellSize:           { value: this.cfg.cellSize },
        uCols:               { value: cols },
        uCount:              { value: projects.length },
        uBgColor:            { value: new THREE.Vector4(0.04, 0.04, 0.04, 1) },
        uBorderColor:        { value: new THREE.Vector4(0.2,  0.2,  0.2,  1) },
        uTextColor:          { value: new THREE.Vector4(0.88, 0.88, 0.88, 1) },
        uHoverColor:         { value: new THREE.Vector4(1,    1,    1,    1) },
        uDistortionStrength: { value: this.cfg.distortionStrength },
        uDistortionRadius:   { value: this.cfg.distortionRadius },
      },
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.scene.add(this.mesh);
  }

  private async loadTextures(): Promise<void> {
    const [imageAtlas, textAtlas] = await Promise.all([
      loadImageAtlas(projects, 512),
      Promise.resolve(createTextAtlas(projects, 512, 96)),
    ]);
    if (!this.material) return;
    this.material.uniforms.uImageAtlas.value = imageAtlas;
    this.material.uniforms.uTextAtlas.value  = textAtlas;
  }

  resize(): void {
    const { innerWidth: w, innerHeight: h } = window;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.camera.left   = -w / 2;
    this.camera.right  =  w / 2;
    this.camera.top    =  h / 2;
    this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();

    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(w, h);
    }
    if (this.material) {
      this.material.uniforms.uResolution.value.set(w, h);
    }
  }

  onPointerDown(e: PointerEvent): void {
    this.isDragging    = true;
    this.isClick       = true;
    this.clickStart    = Date.now();
    this.clickStartPos = { x: e.clientX, y: e.clientY };
    this.lastPointer   = { x: e.clientX, y: e.clientY };

    this.zoomTimer = setTimeout(() => {
      this.targetZoom = this.cfg.zoomOut;
    }, this.cfg.zoomDuration);
  }

  onPointerMove(e: PointerEvent): void {
    this.mouse = { x: e.clientX, y: e.clientY };
    if (!this.isDragging) return;

    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };

    this.targetOffset.x += dx;
    this.targetOffset.y -= dy;

    const moved = Math.hypot(
      e.clientX - this.clickStartPos.x,
      e.clientY - this.clientY(e)
    );
    if (moved > this.cfg.clickMaxMove) this.isClick = false;
  }

  private clientY(e: PointerEvent): number {
    return e.clientY - this.clickStartPos.y + this.clickStartPos.y;
  }

  onPointerUp(e: PointerEvent): void {
    if (this.zoomTimer) clearTimeout(this.zoomTimer);
    this.targetZoom = this.cfg.zoomNormal;

    if (this.isClick && Date.now() - this.clickStart < this.cfg.clickMaxDuration) {
      this.handleClick(e.clientX, e.clientY);
    }

    this.isDragging = false;
    this.isClick    = false;
  }

  onMouseLeave(): void {
    this.mouse = { x: -9999, y: -9999 };
    if (this.material) {
      this.material.uniforms.uMouse.value.set(-9999, -9999);
    }
    if (this.zoomTimer) clearTimeout(this.zoomTimer);
    this.targetZoom = this.cfg.zoomNormal;
    this.isDragging = false;
    this.isClick    = false;
  }

  private handleClick(clientX: number, clientY: number): void {
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // Un-distort the click position to find the true world coordinate
    const corrected = applyRadialDistortion(
      { x: clientX, y: clientY },
      center,
      this.cfg.distortionStrength,
      this.cfg.distortionRadius
    );

    const worldX = (corrected.x - center.x) / this.zoom + center.x - this.offset.x;
    const worldY = (corrected.y - center.y) / this.zoom + center.y - this.offset.y;

    const idx = getCellIndex(
      { x: worldX, y: worldY },
      { x: 0, y: 0 },
      this.cfg.cellSize,
      projects.length
    );

    const project = projects[idx];
    if (project?.slug) {
      this.onNavigate(`/projects/${project.slug}`);
    }
  }

  start(): void {
    const tick = () => {
      this.animFrameId = requestAnimationFrame(tick);

      const lf = this.cfg.lerpFactor;
      this.offset.x += (this.targetOffset.x - this.offset.x) * lf;
      this.offset.y += (this.targetOffset.y - this.offset.y) * lf;
      this.zoom     += (this.targetZoom - this.zoom) * lf;

      if (this.material) {
        this.material.uniforms.uOffset.value.set(this.offset.x, this.offset.y);
        this.material.uniforms.uZoom.value = this.zoom;
        this.material.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);
      }

      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  dispose(): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    if (this.zoomTimer) clearTimeout(this.zoomTimer);

    this.mesh?.geometry.dispose();
    this.material?.dispose();
    (this.material?.uniforms.uImageAtlas.value as THREE.Texture | null)?.dispose();
    (this.material?.uniforms.uTextAtlas.value as THREE.Texture | null)?.dispose();

    this.renderer.dispose();
  }
}
```

- [ ] **Step 2: Confirm TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gallery-scene.ts
git commit -m "feat: add GalleryScene class (Three.js lifecycle, pan, zoom, click routing)"
```

---

## Task 7: GalleryCanvas React Component

**Files:**
- Create: `src/components/GalleryCanvas.tsx`
- Create: `src/components/GalleryCanvas.module.css`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write CSS module**

Create `src/components/GalleryCanvas.module.css`:

```css
.wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  cursor: grab;
}

.wrapper.dragging {
  cursor: grabbing;
}

.canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse at center,
    transparent 55%,
    rgba(0, 0, 0, 0.55) 100%
  );
}
```

- [ ] **Step 2: Write the GalleryCanvas component**

Create `src/components/GalleryCanvas.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GalleryScene } from "@/lib/gallery-scene";
import styles from "./GalleryCanvas.module.css";

export default function GalleryCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef  = useRef<GalleryScene | null>(null);
  const [dragging, setDragging] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new GalleryScene(canvas, (path) => router.push(path));
    sceneRef.current = scene;
    scene.start();

    const onResize = () => scene.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [router]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    sceneRef.current?.onPointerDown(e.nativeEvent);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    sceneRef.current?.onPointerMove(e.nativeEvent);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    sceneRef.current?.onPointerUp(e.nativeEvent);
  };

  const onMouseLeave = () => {
    setDragging(false);
    sceneRef.current?.onMouseLeave();
  };

  return (
    <div
      className={`${styles.wrapper} ${dragging ? styles.dragging : ""}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onMouseLeave={onMouseLeave}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.vignette} />
    </div>
  );
}
```

- [ ] **Step 3: Mount GalleryCanvas in home page**

Replace `src/app/page.tsx`:

```tsx
import GalleryCanvas from "@/components/GalleryCanvas";

export default function Home() {
  return <GalleryCanvas />;
}
```

- [ ] **Step 4: Start dev server and smoke-test**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify:
- Full-screen dark canvas renders immediately.
- Grid cells appear once images finish loading.
- Cursor shows `grab`; switches to `grabbing` while dragging.
- Panning is smooth (lerped, not instant).
- Zoom animates out while dragging, snaps back on release.
- Clicking a cell navigates to `/projects/<slug>`.
- Back link on project page returns to `/`.
- Vignette darkens the screen edges.
- No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ src/app/page.tsx
git commit -m "feat: add GalleryCanvas client component with drag, zoom, and vignette"
```

---

## Task 8: Production Build Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: all tests PASS.

- [ ] **Step 2: TypeScript strict check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Production build**

```bash
npm run build
```
Expected: build succeeds. Static pages for `/` and all `/projects/[slug]` routes generated.

- [ ] **Step 4: Preview production build**

```bash
npm start
```
Open `http://localhost:3000`. Verify same behavior as dev server.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify production build and all tests pass"
```

---

## Self-Review: Spec Coverage

| Requirement | Task |
|-------------|------|
| Infinite draggable grid via shader | Task 4 (`fragmentShader` grid math), Task 6 (`onPointerMove` offset) |
| Inverted fisheye / radial distortion | Task 4 (`applyDistortion` GLSL), Task 3 (`applyRadialDistortion` for click) |
| Zoom-out while dragging, zoom-back on release | Task 6 (`zoomTimer`, `targetZoom`) |
| Vignette overlay | Task 7 (CSS Module `radial-gradient`) |
| Custom cursor grab/grabbing | Task 7 (`dragging` state + CSS Module) |
| IBM Plex Mono font | Task 1 (`next/font/google`) |
| Shader uniforms for offset, resolution, zoom, mouse, colors, atlases | Task 4 (all uniforms declared) |
| Image + text atlas textures | Task 5 (`loadImageAtlas`, `createTextAtlas`) |
| 5×5 atlas layout for 25 items | Task 5 (`packAtlasLayout`) |
| Click vs drag detection (threshold + duration) | Task 6 (`clickMaxMove`, `clickMaxDuration`) |
| Click → grid index → Next.js route | Task 3 (`getCellIndex`), Task 6 (`handleClick`), Task 7 (`useRouter`) |
| `window.location` replaced with `router.push` | Task 6 (`onNavigate` callback), Task 7 (`useRouter`) |
| `onWindowResize` | Task 6 (`resize()`), Task 7 (resize event listener) |
| Dynamic project route | Task 2 (`app/projects/[slug]/page.tsx`, `generateStaticParams`) |
| 25 project images in `public/images/` | Task 2 (`data.ts` image paths) |
| Orthographic camera (flat 2D grid) | Task 6 (`THREE.OrthographicCamera`) |
| Pointer + touch support | Task 6 (pointer events cover touch natively on mobile) |
| Three.js cleanup on unmount | Task 6 (`dispose()`), Task 7 (`useEffect` cleanup) |
