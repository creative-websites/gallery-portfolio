"use client";

import { useState, useEffect } from "react";
import styles from "./Nav.module.css";

const TICKER_ITEMS = [
  "SOUND (07)",
  "PHANTOM IS A TECHNOLOGY-LED CREATIVE AGENCY DELIVERING EXPERIENCES FOR GLOBAL BRANDS.",
  "LONDON, UK",
];

const NAV_TABS = ["Work", "About", "Connect"] as const;
type NavTab = (typeof NAV_TABS)[number];

export default function Nav() {
  const [activeTab, setActiveTab] = useState<NavTab>("Work");
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hh = String(now.getUTCHours()).padStart(2, "0");
      const mm = String(now.getUTCMinutes()).padStart(2, "0");
      setTime(`${hh}:${mm} GMT+1`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  const tickerContent = [...TICKER_ITEMS, time].join("  \u2014  ");

  return (
    <>
      {/* ── Top bar ── */}
      <header className={styles.topBar}>
        {/* Logo */}
        <div className={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="white" strokeWidth="1.5" />
            <path d="M9 14 L14 9 L19 14 L14 19 Z" fill="white" />
          </svg>
        </div>

        {/* CTA */}
        <button className={styles.cta}>Let&apos;s Talk</button>
      </header>

      {/* ── Bottom bar ── */}
      <footer className={styles.bottomBar}>
        {/* Left indicator */}
        <span className={styles.indicator}>01</span>

        {/* Tab nav */}
        <nav className={styles.tabs}>
          {NAV_TABS.map((tab) => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Filter */}
        <button className={styles.filter}>Filter</button>
      </footer>
    </>
  );
}
