"use client";

import { useRef } from "react";
import { gsap, useGSAP, bisaHover } from "../lib/gsap";

// Membungkus tombol agar "tertarik" ke arah kursor.
export default function Magnetic({ children, strength = 0.35 }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !bisaHover()) return;

      const xTo = gsap.quickTo(el, "x", { duration: 1, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 1, ease: "elastic.out(1, 0.4)" });

      const gerak = (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      };
      const keluar = () => {
        xTo(0);
        yTo(0);
      };

      el.addEventListener("mousemove", gerak);
      el.addEventListener("mouseleave", keluar);
      return () => {
        el.removeEventListener("mousemove", gerak);
        el.removeEventListener("mouseleave", keluar);
      };
    },
    { scope: ref }
  );

  return (
    <span ref={ref} className="mag">
      {children}
    </span>
  );
}