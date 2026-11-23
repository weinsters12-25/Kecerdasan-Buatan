"use client";

import { useRef } from "react";
import { gsap, useGSAP, bolehAnimasi } from "../lib/gsap";

// Pita nama kategori yang berjalan terus; melambat saat di-hover.
export default function Marquee({ items = [] }) {
  const ref = useRef(null);
  const daftar = [...items, ...items, ...items, ...items]; // 2 paruh identik agar mulus

  useGSAP(
    () => {
      const box = ref.current;
      const track = box?.querySelector(".mq-track");
      if (!track || !items.length || !bolehAnimasi()) return;

      const tween = gsap.to(track, {
        xPercent: -50,
        duration: Math.max(items.length * 5, 30),
        ease: "none",
        repeat: -1,
      });
      const pelan = () => gsap.to(tween, { timeScale: 0.2, duration: 0.5 });
      const normal = () => gsap.to(tween, { timeScale: 1, duration: 0.5 });

      box.addEventListener("mouseenter", pelan);
      box.addEventListener("mouseleave", normal);
      return () => {
        box.removeEventListener("mouseenter", pelan);
        box.removeEventListener("mouseleave", normal);
      };
    },
    { scope: ref, dependencies: [items.length], revertOnUpdate: true }
  );

  if (!items.length) return null;

  return (
    <div className="mq" ref={ref} aria-hidden="true">
      <div className="mq-track">
        {daftar.map((nama, i) => (
          <span key={i} className="mq-item">
            {nama}
          </span>
        ))}
      </div>
    </div>
  );
}