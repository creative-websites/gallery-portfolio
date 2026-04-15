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

function packCanvasAtlas(tiles: HTMLCanvasElement[], layout: AtlasLayout): HTMLCanvasElement {
  const { cols, tileSize, atlasSize } = layout;
  const atlas = document.createElement("canvas");
  atlas.width = atlasSize;
  atlas.height = atlasSize;
  const ctx = atlas.getContext("2d")!;

  const totalSlots = cols * cols;
  for (let i = 0; i < totalSlots; i++) {
    const tile = tiles[i % tiles.length];
    const col = i % cols;
    const row = Math.floor(i / cols);
    ctx.drawImage(tile, col * tileSize, row * tileSize, tileSize, tileSize);
  }

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

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "\u2026").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "\u2026";
}

function createCardTile(
  project: Project,
  image: HTMLImageElement | null,
  size: number,
  blurBg = false
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Layout constants (proportional to tile size)
  const pad    = Math.round(size * 0.036);   // 18px @ 512
  const topH   = Math.round(size * 0.102);   // 52px @ 512 — top label zone
  const botH   = Math.round(size * 0.176);   // 90px @ 512 — bottom tags zone
  const sep    = Math.round(size * 0.014);   // 7px gap between top/image and image/bottom

  const availH  = size - topH - botH - sep * 2;
  const insetH  = Math.round(size  * 0.08);   // 8% padding left & right
  const insetV  = Math.round(availH * 0.08);  // 8% padding top & bottom within zone
  const imgX = pad + insetH;
  const imgY = topH + sep + insetV;
  const imgW = size - pad * 2 - insetH * 2;
  const imgH = availH - insetV * 2;
  const imgR = Math.round(size * 0.027);     // 14px corner radius

  const fontPx = Math.round(size * 0.021);   // 11px @ 512

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, size, size);

  if (blurBg && image) {
    // Blurred image cover as background layer (hover variant only)
    const iw = image.naturalWidth  || image.width  || 1;
    const ih = image.naturalHeight || image.height || 1;
    const bgScale = Math.max(size / iw, size / ih);
    const bdw = iw * bgScale;
    const bdh = ih * bgScale;
    const bdx = (size - bdw) / 2;
    const bdy = (size - bdh) / 2;
    ctx.save();
    ctx.filter = `blur(${Math.round(size * 0.04)}px)`;
    ctx.drawImage(image, bdx, bdy, bdw, bdh);
    ctx.filter = "none";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
  }

  // ── Top labels ──────────────────────────────────────────────────────────────
  ctx.font = `500 ${fontPx}px 'IBM Plex Mono', monospace`;
  ctx.textBaseline = "middle";
  const topY = Math.round(topH * 0.5);

  // Client — left
  ctx.fillStyle = "rgba(255,255,255,0.60)";
  ctx.textAlign = "left";
  ctx.fillText(project.client.toUpperCase(), pad, topY);

  // Project title — right (truncate if needed)
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.textAlign = "right";
  const clientWidth = ctx.measureText(project.client.toUpperCase()).width;
  const maxTitleWidth = size - pad * 2 - clientWidth - pad;
  const titleText = truncateText(ctx, project.title.toUpperCase(), maxTitleWidth);
  ctx.fillText(titleText, size - pad, topY);

  // Separator line below top labels
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, topH);
  ctx.lineTo(size - pad, topH);
  ctx.stroke();

  // ── Image with rounded corners ──────────────────────────────────────────────
  ctx.save();
  drawRoundedRect(ctx, imgX, imgY, imgW, imgH, imgR);
  ctx.clip();

  if (image) {
    const iw = image.naturalWidth  || image.width  || 1;
    const ih = image.naturalHeight || image.height || 1;
    const scale = Math.min(imgW / iw, imgH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = imgX + (imgW - dw) / 2;
    const dy = imgY + (imgH - dh) / 2;
    ctx.drawImage(image, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = "#181818";
    ctx.fillRect(imgX, imgY, imgW, imgH);
  }
  ctx.restore();

  // Separator line above bottom labels
  const botLineY = imgY + imgH + sep;
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, botLineY);
  ctx.lineTo(size - pad, botLineY);
  ctx.stroke();

  // ── Bottom labels ───────────────────────────────────────────────────────────
  ctx.font = `400 ${fontPx}px 'IBM Plex Mono', monospace`;
  ctx.textBaseline = "middle";
  const botY = botLineY + Math.round((size - botLineY) * 0.48);

  // Tags — left
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.textAlign = "left";
  const tagsStr = project.tags.join(" · ").toUpperCase();
  const maxTagsWidth = size - pad * 2 - ctx.measureText(String(project.year)).width - pad;
  ctx.fillText(truncateText(ctx, tagsStr, maxTagsWidth), pad, botY);

  // Year — right
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.textAlign = "right";
  ctx.fillText(String(project.year), size - pad, botY);

  return canvas;
}

/** Pack full card tiles (image + labels) into a single atlas texture. */
export async function createCardAtlas(
  projects: Project[],
  tileSize: number,
  onProgress?: (progress: number) => void
): Promise<{ normal: THREE.CanvasTexture; hover: THREE.CanvasTexture }> {
  await document.fonts.ready;

  const layout = packAtlasLayout(projects.length, tileSize);
  let loaded = 0;
  const images = await Promise.all(
    projects.map((p) =>
      loadImage(p.imagePath).then((img) => {
        loaded++;
        onProgress?.(loaded / projects.length);
        return img;
      })
    )
  );

  const normalTiles = projects.map((p, i) => createCardTile(p, images[i], tileSize, false));
  const hoverTiles  = projects.map((p, i) => createCardTile(p, images[i], tileSize, true));

  return {
    normal: makeCanvasTexture(packCanvasAtlas(normalTiles, layout)),
    hover:  makeCanvasTexture(packCanvasAtlas(hoverTiles,  layout)),
  };
}
