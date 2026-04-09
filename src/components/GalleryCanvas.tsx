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
