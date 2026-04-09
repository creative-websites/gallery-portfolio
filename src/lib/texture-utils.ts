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
