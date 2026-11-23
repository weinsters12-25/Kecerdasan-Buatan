"use client";

import { motion } from "framer-motion";

export default function ScoreRing({ skor, persen }) {
  const R = 22;
  const C = 2 * Math.PI * R;
  const isi = Math.min(Math.max(skor, 0), 1);
  return (
    <div className={`ring ${persen > 20 ? "hi" : ""}`} title={`${persen}% kemiripan`}>
      <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
        <circle className="track" cx="28" cy="28" r={R} fill="none" strokeWidth="5" />
        <motion.circle
          className="fill"
          cx="28"
          cy="28"
          r={R}
          fill="none"
          strokeWidth="5"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - isi) }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <b>{persen}%</b>
    </div>
  );
}