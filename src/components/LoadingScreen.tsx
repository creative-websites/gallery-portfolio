"use client";

import { useEffect, useRef, useState } from "react";
import { projects } from "@/lib/data";
import styles from "./LoadingScreen.module.css";

type Phase = "intro" | "split" | "flipping" | "exiting" | "done";

interface Props {
  progress: number;
  onComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LoadingScreen({ progress, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [imgIndex, setImgIndex] = useState(0);
  const shuffledPaths = useRef(shuffle(projects.map((p) => p.imagePath)));
  const overlayRef = useRef<HTMLDivElement>(null);

  // intro → split after 1s
  useEffect(() => {
    const t = setTimeout(() => setPhase("split"), 1000);
    return () => clearTimeout(t);
  }, []);

  // split → flipping after transition completes
  useEffect(() => {
    if (phase !== "split") return;
    const t = setTimeout(() => setPhase("flipping"), 700);
    return () => clearTimeout(t);
  }, [phase]);

  // flipping → exiting when loading is done
  useEffect(() => {
    if (phase !== "flipping" || progress < 1) return;
    setPhase("exiting");
  }, [phase, progress]);

  // cycle images while flipping
  useEffect(() => {
    if (phase !== "flipping") return;
    const id = setInterval(() => {
      setImgIndex((i) => (i + 1) % shuffledPaths.current.length);
    }, 80);
    return () => clearInterval(id);
  }, [phase]);

  // overlay slides up → done
  useEffect(() => {
    if (phase !== "exiting") return;
    const el = overlayRef.current;
    if (!el) return;
    const onEnd = (e: TransitionEvent) => {
      if (e.target !== el || e.propertyName !== "transform") return;
      el.removeEventListener("transitionend", onEnd);
      setPhase("done");
      onComplete();
    };
    el.addEventListener("transitionend", onEnd);
    return () => el.removeEventListener("transitionend", onEnd);
  }, [phase, onComplete]);

  if (phase === "done") return null;

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${phase === "exiting" ? styles.exiting : ""}`}
    >
      <div className={`${styles.nameRow}`}>
        <span className={`${styles.word} ${phase !== "intro" ? styles.splitLeft : ""}`}>
          Utkarsh {" "}
        </span>
        <span className={`${styles.word} ${phase !== "intro" ? styles.splitRight : ""}`}>
          Ahhnnnn
        </span>
      </div>

      <div className={`${styles.card} ${phase === "flipping" ? styles.cardVisible : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shuffledPaths.current[imgIndex]}
          alt=""
          className={styles.cardImg}
        />
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
