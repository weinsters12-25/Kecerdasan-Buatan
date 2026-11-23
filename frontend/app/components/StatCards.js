"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, Layers, Library, Trophy } from "lucide-react";
import CountUp from "./CountUp";
import useTilt from "../lib/useTilt";
import { gsap, useGSAP, bolehAnimasi } from "../lib/gsap";
import { hueDariTeks } from "../lib/api";

// Gulir ke elemen, lalu beri kedipan singkat agar jelas tujuannya
const gulirKe = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: bolehAnimasi() ? "smooth" : "auto", block: "start" });
  el.classList.remove("flash");
  void el.offsetWidth; // mulai ulang animasi
  el.classList.add("flash");
  setTimeout(() => el.classList.remove("flash"), 1800);
};

/* Kartu dasar: miring 3D + sorotan cahaya mengikuti kursor */
function Kartu({ href, onClick, Ikon, angka, label, hint, children }) {
  const ref = useRef(null);
  useTilt(ref, 5);

  const gerak = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const isi = (
    <>
      <span className="sc-spot" aria-hidden="true" />
      <div className="sc-top">
        <span className="sc-ic">
          <Ikon size={18} />
        </span>
        <ArrowUpRight size={16} className="sc-go" aria-hidden="true" />
      </div>
      <strong className="sc-num">{angka}</strong>
      <span className="sc-label">{label}</span>
      <div className="sc-vis">{children}</div>
      <small className="sc-hint">{hint}</small>
    </>
  );

  return href ? (
    <Link ref={ref} href={href} className="stat-card" onMouseMove={gerak}>
      {isi}
    </Link>
  ) : (
    <button ref={ref} type="button" className="stat-card" onClick={onClick} onMouseMove={gerak}>
      {isi}
    </button>
  );
}

export default function StatCards({ total = 0, kategori = [], tujuanTerbaik = "terbaik" }) {
  const wrapRef = useRef(null);

  const urut = [...kategori].sort((a, b) => b.jumlah - a.jumlah);

  useGSAP(
    () => {
      if (!bolehAnimasi()) return;
      gsap.from(".stat-card", {
        y: 30,
        autoAlpha: 0,
        duration: 0.8,
        delay: 0.7,
        stagger: 0.12,
        ease: "power3.out",
      });
    },
    { scope: wrapRef }
  );

  return (
    <div className="stat-cards" ref={wrapRef}>
      <Kartu
        href="/katalog"
        Ikon={Library}
        angka={<CountUp to={total} />}
        label="buku"
        hint="Buka katalog lengkap"
      >
        <div className="sc-bar" role="img" aria-label="Sebaran buku per kategori">
          {urut.map((k, i) => (
            <i
              key={k.nama}
              title={`${k.nama}: ${k.jumlah} buku`}
              style={{ flexGrow: k.jumlah, "--h": hueDariTeks(k.nama), "--i": i }}
            />
          ))}
        </div>
      </Kartu>

      <Kartu
        onClick={() => gulirKe("rak-kategori")}
        Ikon={Layers}
        angka={<CountUp to={kategori.length} />}
        label="kategori"
        hint="Lihat rak kategori"
      >
        <div className="sc-dots">
          {urut.slice(0, 14).map((k, i) => (
            <i
              key={k.nama}
              title={`${k.nama}: ${k.jumlah} buku`}
              style={{ "--h": hueDariTeks(k.nama), "--i": i }}
            />
          ))}
        </div>
      </Kartu>

      <Kartu
        onClick={() => gulirKe(tujuanTerbaik)}
        Ikon={Trophy}
        angka={<CountUp to={3} />}
        label="rekomendasi terbaik"
        hint="Lihat buku terbaik"
      >
        <div className="sc-medals">
          <span className="m1">#1</span>
          <span className="m2">#2</span>
          <span className="m3">#3</span>
        </div>
      </Kartu>
    </div>
  );
}