"use client";

import { useRef } from "react";
import { Heart } from "lucide-react";
import { gsap, bolehAnimasi } from "../lib/gsap";
import { useDaftarSaya } from "../lib/useDaftarSaya";

// penuh = tombol berlabel (halaman detail); default = ikon bulat di pojok kartu
export default function BookmarkButton({ id, judul = "", penuh = false }) {
  const { ada, toggle } = useDaftarSaya();
  const ref = useRef(null);
  const simpan = ada(id);

  const klik = (e) => {
    e.preventDefault(); // tombol ini berada di atas kartu yang berupa link
    e.stopPropagation();
    toggle(id);
    if (simpan || !bolehAnimasi() || !ref.current) return;

    const el = ref.current;
    gsap.fromTo(
      el.querySelector("svg"),
      { scale: 0.4 },
      { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.4)" }
    );
    // percikan kecil
    const wadah = el.querySelector(".bm-burst");
    for (let i = 0; i < 8; i++) {
      const s = document.createElement("i");
      wadah.appendChild(s);
      const a = (i / 8) * Math.PI * 2;
      gsap.fromTo(
        s,
        { x: 0, y: 0, scale: 1, autoAlpha: 1 },
        {
          x: Math.cos(a) * 24,
          y: Math.sin(a) * 24,
          scale: 0,
          autoAlpha: 0,
          duration: 0.6,
          ease: "power2.out",
          onComplete: () => s.remove(),
        }
      );
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      className={`bm${penuh ? " bm-full" : ""}${simpan ? " on" : ""}`}
      aria-pressed={simpan}
      aria-label={simpan ? `Hapus ${judul} dari daftar saya` : `Simpan ${judul} ke daftar saya`}
      onClick={klik}
    >
      <Heart size={penuh ? 18 : 16} fill={simpan ? "currentColor" : "none"} />
      {penuh && <span>{simpan ? "Tersimpan di daftar saya" : "Simpan ke daftar saya"}</span>}
      <span className="bm-burst" aria-hidden="true" />
    </button>
  );
}