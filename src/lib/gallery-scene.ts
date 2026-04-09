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
      e.clientY - this.clickStartPos.y
    );
    if (moved > this.cfg.clickMaxMove) this.isClick = false;
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
