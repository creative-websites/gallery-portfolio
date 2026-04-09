import * as THREE from "three";
import { projects } from "./data";
import { vertexShader, fragmentShader } from "./shaders";
import { createCardAtlas } from "./texture-utils";
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
  momentumDecay: number;
  hoverDriftMax: number;
  hoverDriftLerp: number;
}

const DEFAULT_CONFIG: GalleryConfig = {
  cellSize: 340,
  lerpFactor: 0.08,
  zoomOut: 0.85,
  zoomNormal: 1.0,
  zoomDuration: 100,
  distortionStrength: 0.5,
  distortionRadius: 900,
  clickMaxDuration: 200,
  clickMaxMove: 6,
  momentumDecay: 0.9,
  hoverDriftMax: 40,
  hoverDriftLerp: 0.04,
};

export class GalleryScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;

  private offset: Vec2 = { x: 0, y: 0 };
  private targetOffset: Vec2 = { x: 0, y: 0 };
  private hoverOffset: Vec2 = { x: 0, y: 0 };
  private zoom: number;
  private targetZoom: number;
  private mouse: Vec2 = { x: -9999, y: -9999 };

  private isDragging = false;
  private isClick = false;
  private clickStart = 0;
  private clickStartPos: Vec2 = { x: 0, y: 0 };
  private lastPointer: Vec2 = { x: 0, y: 0 };
  private velocity: Vec2 = { x: 0, y: 0 };
  private moveHistory: Array<{ x: number; y: number; t: number }> = [];
  private zoomTimer: ReturnType<typeof setTimeout> | null = null;

  private animFrameId: number | null = null;
  private cfg: GalleryConfig;
  private onNavigate: (path: string) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onNavigate: (path: string) => void,
    cfg: Partial<GalleryConfig> = {},
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.zoom = this.cfg.zoomNormal;
    this.targetZoom = this.cfg.zoomNormal;
    this.onNavigate = onNavigate;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.scene = new THREE.Scene();
    this.camera = this.makeCamera();

    this.buildMesh();
    this.loadTextures().catch((err) => {
      console.error("[GalleryScene] texture load failed:", err);
    });
  }

  private makeCamera(): THREE.OrthographicCamera {
    const { innerWidth: w, innerHeight: h } = window;
    const cam = new THREE.OrthographicCamera(
      -w / 2,
      w / 2,
      h / 2,
      -h / 2,
      0.1,
      10,
    );
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
        uResolution: { value: new THREE.Vector2(w, h) },
        uOffset: { value: new THREE.Vector2(0, 0) },
        uMouse: { value: new THREE.Vector2(-9999, -9999) },
        uZoom: { value: this.zoom },
        uCardAtlas: { value: null },
        uCardAtlasHover: { value: null },
        uCellSize: { value: this.cfg.cellSize },
        uCols: { value: cols },
        uCount: { value: projects.length },
        uBgColor: { value: new THREE.Vector4(0.031, 0.031, 0.031, 1) },
        uBorderColor: { value: new THREE.Vector4(0.12, 0.12, 0.12, 1) },
        uHoverColor: { value: new THREE.Vector4(1, 1, 1, 1) },
        uDistortionStrength: { value: this.cfg.distortionStrength },
        uDistortionRadius: { value: this.cfg.distortionRadius },
      },
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.scene.add(this.mesh);
  }

  private async loadTextures(): Promise<void> {
    const { normal, hover } = await createCardAtlas(projects, 512);
    if (!this.material) return;
    this.material.uniforms.uCardAtlas.value = normal;
    this.material.uniforms.uCardAtlasHover.value = hover;
  }

  resize(): void {
    const { innerWidth: w, innerHeight: h } = window;
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.camera.left = -w / 2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
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
    this.isDragging = true;
    this.isClick = true;
    this.clickStart = Date.now();
    this.clickStartPos = { x: e.clientX, y: e.clientY };
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.moveHistory = [];

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

    const now = Date.now();
    this.moveHistory.push({ x: e.clientX, y: e.clientY, t: now });
    // Keep only the last 150ms of history
    while (this.moveHistory.length > 1 && now - this.moveHistory[0].t > 150) {
      this.moveHistory.shift();
    }

    this.targetOffset.x += dx;
    this.targetOffset.y -= dy;

    const moved = Math.hypot(
      e.clientX - this.clickStartPos.x,
      e.clientY - this.clickStartPos.y,
    );
    if (moved > this.cfg.clickMaxMove) this.isClick = false;
  }

  onPointerUp(e: PointerEvent): void {
    if (this.zoomTimer) clearTimeout(this.zoomTimer);
    this.targetZoom = this.cfg.zoomNormal;

    if (
      this.isClick &&
      Date.now() - this.clickStart < this.cfg.clickMaxDuration
    ) {
      this.velocity = { x: 0, y: 0 };
      this.moveHistory = [];
      this.handleClick(e.clientX, e.clientY);
    } else if (this.moveHistory.length >= 2) {
      const first = this.moveHistory[0];
      const last = this.moveHistory[this.moveHistory.length - 1];
      const dt = Math.max(last.t - first.t, 1);
      // Scale to per-frame velocity (~16ms at 60fps)
      this.velocity.x = ((last.x - first.x) / dt) * 16;
      this.velocity.y = (-(last.y - first.y) / dt) * 16;
    } else {
      this.velocity = { x: 0, y: 0 };
    }
    this.moveHistory = [];

    this.isDragging = false;
    this.isClick = false;
  }

  onMouseLeave(): void {
    this.mouse = { x: -9999, y: -9999 };
    this.velocity = { x: 0, y: 0 };
    this.moveHistory = [];
    if (this.material) {
      this.material.uniforms.uMouse.value.set(-9999, -9999);
    }
    if (this.zoomTimer) clearTimeout(this.zoomTimer);
    this.targetZoom = this.cfg.zoomNormal;
    this.isDragging = false;
    this.isClick = false;
  }

  private handleClick(clientX: number, clientY: number): void {
    const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    // Correct for the full-screen dome distortion (centered on screen center)
    // before mapping click to world coordinates.
    const corrected = applyRadialDistortion(
      { x: clientX, y: clientY },
      center,
      this.cfg.distortionStrength,
      this.cfg.distortionRadius,
    );

    // Y flip: clientY is 0 at top, shader fragCoord.y is 0 at bottom.
    const totalOffsetX = this.offset.x + this.hoverOffset.x;
    const totalOffsetY = this.offset.y + this.hoverOffset.y;
    const worldX =
      (corrected.x - center.x) / this.zoom + center.x - totalOffsetX;
    const worldY =
      (center.y - corrected.y) / this.zoom + center.y - totalOffsetY;

    const idx = getCellIndex(
      { x: worldX, y: worldY },
      { x: 0, y: 0 },
      this.cfg.cellSize,
      projects.length,
    );

    const project = projects[idx];
    if (project?.slug) {
      this.onNavigate(`/projects/${project.slug}`);
    }
  }

  start(): void {
    const tick = () => {
      const lf = this.cfg.lerpFactor;

      if (!this.isDragging) {
        this.targetOffset.x += this.velocity.x;
        this.targetOffset.y += this.velocity.y;
        this.velocity.x *= this.cfg.momentumDecay;
        this.velocity.y *= this.cfg.momentumDecay;
      }

      this.offset.x += (this.targetOffset.x - this.offset.x) * lf;
      this.offset.y += (this.targetOffset.y - this.offset.y) * lf;
      this.zoom += (this.targetZoom - this.zoom) * lf;

      // Hover drift: nudge grid toward mouse position, fade to zero when absent
      const mousePresent = this.mouse.x > -9000;
      const dl = this.cfg.hoverDriftLerp;
      if (mousePresent && !this.isDragging) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const nx = (this.mouse.x - cx) / cx; // -1 … 1
        const ny = (this.mouse.y - cy) / cy; // -1 … 1 (y-down)
        const max = this.cfg.hoverDriftMax;
        this.hoverOffset.x += (nx * max - this.hoverOffset.x) * dl;
        this.hoverOffset.y += (-ny * max - this.hoverOffset.y) * dl;
      }

      if (this.material) {
        this.material.uniforms.uOffset.value.set(
          this.offset.x + this.hoverOffset.x,
          this.offset.y + this.hoverOffset.y,
        );
        this.material.uniforms.uZoom.value = this.zoom;
        // Flip Y: clientY is 0 at top; shader fragCoord.y is 0 at bottom
        this.material.uniforms.uMouse.value.set(
          this.mouse.x,
          window.innerHeight - this.mouse.y,
        );
      }

      this.renderer.render(this.scene, this.camera);
      // Schedule next frame AFTER render so dispose() always cancels the correct id.
      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  dispose(): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    if (this.zoomTimer) clearTimeout(this.zoomTimer);

    if (this.mesh) this.scene.remove(this.mesh);
    this.mesh?.geometry.dispose();
    (
      this.material?.uniforms.uCardAtlas.value as THREE.Texture | null
    )?.dispose();
    (
      this.material?.uniforms.uCardAtlasHover.value as THREE.Texture | null
    )?.dispose();
    this.material?.dispose();
    this.renderer.dispose();
  }
}
