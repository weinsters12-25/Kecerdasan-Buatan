"use client";

import { useMemo } from "react";

const rng = (seed) => {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
};

// Bentuk cipratan: titik berselang-seling panjang/pendek, dihaluskan, plus tetesan kecil
export function bentukSplat(seed) {
  const r = rng(seed);
  const n = 16;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rad = i % 2 === 0 ? 30 + r() * 16 : 16 + r() * 8;
    pts.push([50 + Math.cos(a) * rad, 50 + Math.sin(a) * rad]);
  }
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % n];
    if (i === 0) {
      const pl = pts[n - 1];
      d += `M${((pl[0] + p0[0]) / 2).toFixed(1)},${((pl[1] + p0[1]) / 2).toFixed(1)}`;
    }
    d += ` Q${p0[0].toFixed(1)},${p0[1].toFixed(1)} ${((p0[0] + p1[0]) / 2).toFixed(1)},${((p0[1] + p1[1]) / 2).toFixed(1)}`;
  }
  d += "Z";
  const drops = Array.from({ length: 8 }, () => {
    const a = r() * Math.PI * 2;
    const dist = 40 + r() * 12;
    return { x: 50 + Math.cos(a) * dist, y: 50 + Math.sin(a) * dist, r: 1.2 + r() * 3 };
  });
  return { d, drops };
}

export default function Splat({ seed = 1, className = "", style }) {
  const { d, drops } = useMemo(() => bentukSplat(seed), [seed]);
  return (
    <svg viewBox="0 0 100 100" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d={d} />
      {drops.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={c.r} />
      ))}
    </svg>
  );
}