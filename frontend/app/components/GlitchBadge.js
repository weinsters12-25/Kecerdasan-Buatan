"use client";

import { useEffect, useRef } from "react";
import { BrainCircuit, Sparkles } from "lucide-react";

const TEKS = "Rekomendasi pintar berbasis AI";
const GLYPH = "▓▒░#@%&$*+=<>/\\|01";

export default function GlitchBadge() {
  const ref = useRef(null);
  const timer = useRef(null);

  // Teks diacak lalu tersusun kembali huruf demi huruf
  const acak = () => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    clearInterval(timer.current);
    let f = 0;
    const total = 22;
    timer.current = setInterval(() => {
      f++;
      const jadi = Math.floor((f / total) * TEKS.length);
      const s = TEKS.split("")
        .map((c, i) => (c === " " || i < jadi ? c : GLYPH[Math.floor(Math.random() * GLYPH.length)]))
        .join("");
      el.textContent = s;
      el.dataset.text = s;
      if (f >= total) {
        clearInterval(timer.current);
        el.textContent = TEKS;
        el.dataset.text = TEKS;
      }
    }, 35);
  };

  useEffect(() => {
    const t = setTimeout(acak, 900);
    const loop = setInterval(acak, 9000);
    return () => {
      clearTimeout(t);
      clearInterval(loop);
      clearInterval(timer.current);
    };
  }, []);

  return (
    <span className="gb-wrap" onMouseEnter={acak}>
      <span className="gb">
        <span className="gb-ico">
          <BrainCircuit size={16} />
        </span>
        <span className="sr">{TEKS}</span>
        <span ref={ref} className="gb-text" data-text={TEKS} aria-hidden="true">
          {TEKS}
        </span>
        <span className="gb-bars" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="gb-scan" aria-hidden="true" />
      </span>
      <Sparkles className="gb-spark s1" size={14} aria-hidden="true" />
      <Sparkles className="gb-spark s2" size={12} aria-hidden="true" />
    </span>
  );
}