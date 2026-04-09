export interface Vec2 { x: number; y: number }

/**
 * Applies inverted fisheye radial distortion in screen/canvas space.
 * Points within `radius` of `center` are pulled inward (barrel distortion).
 * Points outside `radius` are pushed outward.
 * Used to map a click position back to its pre-distortion world coordinate.
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
