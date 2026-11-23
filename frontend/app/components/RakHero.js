"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BookCover from "./BookCover";
import { gsap, useGSAP, bolehAnimasi, bisaHover } from "../lib/gsap";
import { hueDariTeks } from "../lib/api";
import { useDaftarSaya } from "../lib/useDaftarSaya";

const hash = (s) => {
  let h = 2166136261;
  for (const c of String(s)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// Ketebalan mengikuti jumlah halaman, tinggi acak tapi stabil per judul
const ukuran = (b) => ({
  T: Math.round(Math.min(74, Math.max(38, 30 + (b.jumlah_halaman || 250) / 9))),
  H: Math.round(150 + ((hash(b.judul) % 1000) / 1000) * 90),
});

export default function RakHero({ buku = [] }) {
  const ref = useRef(null);
  const { ada } = useDaftarSaya();
  const [lebar, setLebar] = useState(560);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLebar(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tampil = useMemo(() => {
    if (!buku.length) return [];
    const urut = [...buku].sort(
      (a, b) => (b.gambar ? 1 : 0) - (a.gambar ? 1 : 0) || hash(a.id_buku) - hash(b.id_buku)
    );
    const per = new Map();
    urut.forEach((b) => {
      if (!per.has(b.kategori)) per.set(b.kategori, b);
    });
    const pertama = [...per.values()];
    const kandidat = [...pertama, ...urut.filter((b) => !pertama.includes(b))].slice(0, 14);

    const maks = Math.max(lebar - 24, 160);
    let total = 0;
    const out = [];
    for (const b of kandidat) {
      const u = ukuran(b);
      if (total + u.T + 6 > maks) continue;
      out.push({ ...b, ...u });
      total += u.T + 6;
    }
    return out.sort((a, b) => hash(`x${a.id_buku}`) - hash(`x${b.id_buku}`));
  }, [buku, lebar]);

  const kunci = tampil.map((b) => b.id_buku).join(",");

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !tampil.length || !bolehAnimasi()) return;

      gsap.from(".hs-book", {
        y: -220,
        autoAlpha: 0,
        rotation: () => gsap.utils.random(-8, 8),
        duration: 1,
        ease: "bounce.out",
        delay: 0.3,
        stagger: { each: 0.07, from: "random" },
      });

      gsap.to(el, {
        y: -40,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top 70%", end: "bottom top", scrub: true },
      });

      if (!bisaHover()) return;
      const pasang = gsap.utils.toArray(".hs-book").map((b) => {
        const naik = () =>
          gsap.to(b, { y: -16, rotation: -2, duration: 0.4, ease: "back.out(2.5)", overwrite: "auto" });
        const turun = () =>
          gsap.to(b, { y: 0, rotation: 0, duration: 0.5, ease: "power3.out", overwrite: "auto" });
        b.addEventListener("mouseenter", naik);
        b.addEventListener("mouseleave", turun);
        return [b, naik, turun];
      });
      return () =>
        pasang.forEach(([b, naik, turun]) => {
          b.removeEventListener("mouseenter", naik);
          b.removeEventListener("mouseleave", turun);
        });
    },
    { scope: ref, dependencies: [kunci], revertOnUpdate: true }
  );

  return (
    <div className="hs" ref={ref}>
      <div className="hs-row">
        {tampil.map((b, i) => (
          <Link
            key={b.id_buku}
            href={`/buku/${b.id_buku}`}
            className={`hs-book rk-look${i === 0 ? " hs-first" : ""}${
              i === tampil.length - 1 ? " hs-last" : ""
            }${ada(b.id_buku) ? " tandai" : ""}`}
            style={{ width: b.T, height: b.H, "--h": hueDariTeks(b.kategori) }}
            aria-label={`${b.judul}, ${b.penulis}`}
          >
            <span className="rk-band" />
            <span className="rk-title" style={{ fontSize: Math.max(11, Math.min(15, b.T * 0.24)) }}>
              {b.judul}
            </span>
            <span className="rk-band" />

            <div className="hs-tip" aria-hidden="true">
              <BookCover buku={b} size="sm" />
              <div>
                <strong>{b.judul}</strong>
                <small>{b.penulis}</small>
                <small>{b.kategori}</small>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="hs-board" />
    </div>
  );
}