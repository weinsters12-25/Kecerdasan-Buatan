"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, BookOpen, Undo2 } from "lucide-react";
import { gsap, useGSAP, bolehAnimasi, bisaHover } from "../lib/gsap";
import { getBuku, hueDariTeks } from "../lib/api";
import BookCard from "./BookCard";
import Reveal from "./Reveal";

/* ---------- Ukuran buku ---------- */
const hash = (s) => {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const ketebalan = (n) => Math.min(124, Math.round(38 + 19 * Math.sqrt(n)));
const tinggiAcak = (nama) => 190 + ((hash(nama) % 1000) / 1000) * 90;
const lebarSampul = (it) => Math.round(it.H * 0.7);

/* ---------- Singkatan untuk buku tipis (teks tegak, mudah dibaca) ---------- */
const KATA_SAMBUNG = new Set(["dan", "di", "ke", "&", "of", "the"]);
const singkat = (nama) => {
  const kata = nama
    .trim()
    .split(/\s+/)
    .filter((w) => w && !KATA_SAMBUNG.has(w.toLowerCase()));
  if (kata.length >= 2) return (kata[0][0] + kata[1][0]).toUpperCase();
  return (kata[0] || nama).slice(0, 2).toUpperCase();
};

function PunggungIsi({ it }) {
  const lebar = it.T >= 88; // cukup tebal: tulis nama kategori secara horizontal
  return (
    <>
      <span className="rk-band" />
      <span className="rk-label">
        {lebar ? (
          <span className="rk-name" style={{ fontSize: Math.min(15, Math.max(11, it.T * 0.14)) }}>
            {it.nama}
          </span>
        ) : (
          <span className="rk-ab" style={{ fontSize: Math.max(11, Math.min(22, it.T * 0.36)) }}>
            {singkat(it.nama)}
          </span>
        )}
      </span>
      <span className="rk-count">{it.jumlah}</span>
      <span className="rk-band" />
    </>
  );
}

function SampulIsi({ it }) {
  return (
    <>
      <i className="cv-line" />
      <small>Kategori</small>
      <strong>{it.nama}</strong>
      <span>{it.jumlah} buku</span>
      <b className="cv-mark">{it.nama.charAt(0)}</b>
    </>
  );
}

/*
  Props:
  - kategori : [{ nama, jumlah, sampul }]
  - aktif    : nama kategori yang sedang dipilih (untuk penanda emas)
  - onBuka   : (nama) => void. Jika diisi, panel isi TIDAK ditampilkan di sini
               (dipakai halaman Katalog).
*/
export default function RakKategori({ kategori = [], aktif = "", onBuka }) {
  const internal = !onBuka;
  const rakRef = useRef(null);
  const stageRef = useRef(null);
  const retRef = useRef(null);
  const panelRef = useRef(null);
  const spineRefs = useRef({});
  const tlRef = useRef(null);
  const sibuk = useRef(false);

  const [lebar, setLebar] = useState(1000);
  const [anim, setAnim] = useState(null);
  const [kembali, setKembali] = useState(null);
  const [halaman, setHalaman] = useState([]);
  const [diambil, setDiambil] = useState("");
  const [terbuka, setTerbuka] = useState(null);

  useEffect(() => {
    const el = rakRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLebar(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const k = lebar < 520 ? 0.62 : lebar < 760 ? 0.8 : 1;

  const items = useMemo(
    () =>
      kategori.map((c) => ({
        ...c,
        T: Math.round(ketebalan(c.jumlah) * k),
        H: Math.round(tinggiAcak(c.nama) * k),
        hue: hueDariTeks(c.nama),
      })),
    [kategori, k]
  );

  const baris = useMemo(() => {
    const maks = Math.max(lebar - 72, 200);
    const rows = [[]];
    let w = 0;
    for (const it of items) {
      const tambah = it.T + 8;
      if (w + tambah > maks && rows[rows.length - 1].length) {
        rows.push([]);
        w = 0;
      }
      rows[rows.length - 1].push(it);
      w += tambah;
    }
    return rows;
  }, [items, lebar]);

  /* ----- animasi masuk ----- */
  useGSAP(
    () => {
      if (!kategori.length || !bolehAnimasi()) return;
      gsap.from(".rk-spine", {
        y: -160,
        autoAlpha: 0,
        rotation: () => gsap.utils.random(-7, 7),
        duration: 0.9,
        ease: "bounce.out",
        stagger: { each: 0.06, from: "random" },
        scrollTrigger: { trigger: rakRef.current, start: "top 85%", once: true },
      });
    },
    { scope: rakRef, dependencies: [kategori.length] }
  );

  /* ----- hover ----- */
  const naik = (nama) => {
    if (!bisaHover() || sibuk.current) return;
    gsap.to(spineRefs.current[nama], { y: -18, duration: 0.35, ease: "back.out(2.2)", overwrite: "auto" });
  };
  const turun = (nama) => {
    if (!bisaHover()) return;
    gsap.to(spineRefs.current[nama], { y: 0, duration: 0.4, ease: "power3.out", overwrite: "auto" });
  };

  /* ----- pengembalian cepat (ganti kategori / mode katalog) ----- */
  const kembalikanCepat = (nama) => {
    const el = spineRefs.current[nama];
    if (!el || !bolehAnimasi()) return;
    gsap.killTweensOf(el);
    gsap.set(el, { y: -80, rotation: -5, autoAlpha: 0 });
    gsap
      .timeline()
      .to(el, { autoAlpha: 1, duration: 0.2, ease: "none" }, 0)
      .to(el, { y: 0, duration: 0.5, ease: "power3.in" }, 0)
      .to(el, { rotation: 0, duration: 0.9, ease: "elastic.out(1, 0.35)" }, 0.15)
      .fromTo(el, { scaleY: 0.94 }, { scaleY: 1, duration: 0.8, ease: "elastic.out(1, 0.3)" }, 0.5);
  };

  /* ----- klik: ambil buku ----- */
  const ambil = (it) => {
    if (sibuk.current) return;
    sibuk.current = true;

    if (terbuka) {
      const lama = terbuka.nama;
      setTerbuka(null);
      gsap.delayedCall(0.05, () => kembalikanCepat(lama));
    }

    const janji = getBuku(it.nama).catch(() => []);
    setHalaman([]);

    const el = spineRefs.current[it.nama];
    if (!bolehAnimasi() || !el) {
      selesai(it, janji);
      return;
    }
    gsap.set(el, { y: 0 });
    const r = el.getBoundingClientRect();
    setDiambil(it.nama);
    setAnim({ it, janji, rect: { left: r.left, top: r.top } });
  };

  const selesai = async (it, janji) => {
    const buku = await janji;
    if (internal) {
      setDiambil(it.nama);
      setTerbuka({ nama: it.nama, jumlah: it.jumlah, buku });
    } else {
      setDiambil("");
      onBuka(it.nama);
      gsap.delayedCall(0.1, () => kembalikanCepat(it.nama));
    }
    setAnim(null);
    sibuk.current = false;
  };

  /* ----- taruh kembali: buku terbang ke slotnya ----- */
  const taruhKembali = () => {
    if (!terbuka || sibuk.current) return;
    const it = items.find((x) => x.nama === terbuka.nama);
    setTerbuka(null);
    if (!it || !bolehAnimasi()) {
      setDiambil("");
      rakRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    sibuk.current = true;
    setKembali({ it });
  };

  /* ----- timeline: ambil -> terbang -> putar -> buka ----- */
  useEffect(() => {
    if (!anim) return;
    const { it, rect, janji } = anim;
    const { T, H } = it;
    const D = lebarSampul(it);
    let batal = false;

    janji.then((b) => !batal && setHalaman(b));

    const ctx = gsap.context(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const targetH = Math.min(vh * 0.62, 460, (vw * 0.88) / 1.45);
      const s = targetH / H;
      const dx = vw / 2 - (rect.left + T / 2);
      const dy = vh / 2 - (rect.top + H / 2);

      gsap.set(".fb-pos", { x: 0, y: 0, scale: 1 });
      gsap.set(".fb-book", { transformPerspective: 1800, z: -D / 2, rotationY: 0 });
      gsap.set(".fb-cover", { transformPerspective: 2400, transformOrigin: "left center" });
      gsap.set(".fb-open", { autoAlpha: 0 });

      const tl = gsap.timeline({ onComplete: () => selesai(it, janji) });
      tlRef.current = tl;

      tl.to(".fb-dim", { autoAlpha: 1, duration: 0.45 }, 0)
        .to(".fb-book", { z: 0, duration: 0.45, ease: "power3.out" }, 0)
        .to(".fb-pos", { x: dx, y: dy, scale: s, duration: 0.9, ease: "expo.inOut" }, 0.2)
        .to(".fb-book", { rotationY: -90, duration: 0.85, ease: "power3.inOut" }, 0.6)
        .add(() => {
          gsap.set(".fb-book", { autoAlpha: 0 });
          gsap.set(".fb-open", { autoAlpha: 1 });
        })
        .to(".fb-cover", { rotationY: -180, duration: 1, ease: "power3.inOut" })
        .to(".fb-pos", { x: dx + (D * s) / 2, duration: 1, ease: "power3.inOut" }, "<")
        .to({}, { duration: 0.4 })
        .to(".fb-pos", { scale: s * 1.25, autoAlpha: 0, duration: 0.5, ease: "power2.in" })
        .to(".fb-dim", { autoAlpha: 0, duration: 0.4 }, "<0.1");
    }, stageRef);

    return () => {
      batal = true;
      tlRef.current = null;
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim]);

  /* ----- timeline: kembali (terbang dari tengah layar ke slot, mendarat memantul) ----- */
  useEffect(() => {
    if (!kembali) return;
    const { it } = kembali;
    const { T, H } = it;

    const akhir = () => {
      setDiambil("");
      setKembali(null);
      sibuk.current = false;
      tlRef.current = null;
      setTimeout(() => {
        const el = spineRefs.current[it.nama];
        if (el) gsap.fromTo(el, { y: -4 }, { y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      }, 30);
    };

    const ctx = gsap.context(() => {
      const lanjut = () => {
        const slot = spineRefs.current[it.nama];
        if (!slot) {
          akhir();
          return;
        }
        slot.scrollIntoView({ block: "center", behavior: "instant" });
        const r = slot.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const s = Math.min(vh * 0.5, 380) / H;
        const x0 = vw / 2 - (r.left + T / 2);
        const y0 = vh / 2 - (r.top + H / 2);

        gsap.set(".rt-fly", {
          left: r.left,
          top: r.top,
          x: x0,
          y: y0,
          scale: s,
          rotation: -9,
          rotationY: 60,
          transformPerspective: 1100,
          transformOrigin: "50% 100%",
          autoAlpha: 0,
        });

        const tl = gsap.timeline({ onComplete: akhir });
        tlRef.current = tl;

        tl.to(".rt-fly", { autoAlpha: 1, duration: 0.25, ease: "none" }, 0)
          .to(".rt-fly", { x: 0, duration: 1.1, ease: "power3.inOut" }, 0.05)
          .to(
            ".rt-fly",
            {
              keyframes: [
                { y: y0 - 50, duration: 0.35, ease: "power2.out" },
                { y: 0, duration: 0.85, ease: "power3.in" },
              ],
            },
            0.05
          )
          .to(".rt-fly", { scale: 1, duration: 1.15, ease: "power2.inOut" }, 0.05)
          .to(".rt-fly", { rotationY: 0, duration: 0.9, ease: "power2.out" }, 0.05)
          .to(".rt-fly", { rotation: 0, duration: 1.1, ease: "back.out(1.6)" }, 0.05)
          .to(".rt-dim", { autoAlpha: 0, duration: 0.55 }, 1.0)
          .to(".rt-fly", { scaleY: 0.92, scaleX: 1.05, duration: 0.09, ease: "power2.out" }, 1.2)
          .to(".rt-fly", { scaleY: 1, scaleX: 1, duration: 0.85, ease: "elastic.out(1, 0.3)" });
      };

      gsap.set(".rt-dim", { autoAlpha: 0 });
      gsap.to(".rt-dim", { autoAlpha: 1, duration: 0.3, onComplete: () => ctx.add(lanjut) });
    }, retRef);

    return () => {
      tlRef.current = null;
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kembali]);

  /* ----- panel isi katalog ----- */
  useGSAP(
    () => {
      const el = panelRef.current;
      if (!terbuka || !el) return;
      if (bolehAnimasi()) {
        gsap.from(el, { autoAlpha: 0, y: 50, duration: 0.7, ease: "power3.out" });
      }
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    { dependencies: [terbuka?.nama] }
  );

  const ov = anim?.it;
  const D = ov ? lebarSampul(ov) : 0;

  return (
    <div className="rk" ref={rakRef}>
      <div className="rk-wall">
        {baris.map((row, ri) => (
          <div className="rk-level" key={ri}>
            <div className="rk-row">
              {row.map((it, ci) => (
                <div className="rk-slot" key={it.nama} style={{ width: it.T, height: it.H }}>
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) spineRefs.current[it.nama] = el;
                    }}
                    className="rk-spine rk-look"
                    aria-label={`Buka kategori ${it.nama}, ${it.jumlah} buku`}
                    aria-current={aktif && aktif === it.nama ? "true" : undefined}
                    style={{
                      width: it.T,
                      height: it.H,
                      "--h": it.hue,
                      visibility: diambil === it.nama ? "hidden" : undefined,
                    }}
                    onMouseEnter={() => naik(it.nama)}
                    onMouseLeave={() => turun(it.nama)}
                    onFocus={() => naik(it.nama)}
                    onBlur={() => turun(it.nama)}
                    onClick={() => ambil(it)}
                  >
                    <PunggungIsi it={it} />

                    {/* Kartu hover: nama kategori lengkap */}
                    <span
                      className={`rk-tip${ci === 0 ? " l" : ""}${ci === row.length - 1 ? " r" : ""}`}
                      aria-hidden="true"
                    >
                      <small>Kategori</small>
                      <strong>{it.nama}</strong>
                      <em>{it.jumlah} buku · klik untuk membuka</em>
                    </span>
                  </button>

                  {diambil === it.nama && (
                    <span className="rk-ghost" style={{ "--h": it.hue }} aria-hidden="true">
                      <BookOpen size={17} />
                      <em>Sedang dibaca</em>
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="rk-board" />
          </div>
        ))}
      </div>

      <p className="rk-hint">Arahkan kursor ke buku untuk melihat kategorinya, lalu klik untuk membukanya.</p>

      {internal && terbuka && (
        <div className="rk-panel" ref={panelRef}>
          <div className="rk-panel-head">
            <div>
              <span className="reading">
                <BookOpen size={13} /> Sedang dibaca
              </span>
              <h3>{terbuka.nama}</h3>
              <p>{terbuka.buku.length} buku di rak ini</p>
            </div>
            <div className="rk-actions">
              <Link href={`/katalog?kategori=${encodeURIComponent(terbuka.nama)}`} className="btn ghost">
                Buka di katalog <ArrowRight size={16} />
              </Link>
              <button type="button" className="btn ghost" onClick={taruhKembali}>
                <Undo2 size={16} /> Taruh kembali
              </button>
            </div>
          </div>
          <Reveal className="grid" deps={[terbuka.nama]}>
            {terbuka.buku.map((b) => (
              <BookCard key={b.id_buku} buku={b} />
            ))}
          </Reveal>
        </div>
      )}

      {/* ===== Lapisan animasi: buku diambil & dibuka ===== */}
      {ov &&
        createPortal(
          <div className="fb-stage" ref={stageRef} aria-hidden="true" onClick={() => tlRef.current?.timeScale(4)}>
            <div className="fb-dim" />
            <div
              className="fb-pos"
              style={{ left: anim.rect.left, top: anim.rect.top, width: ov.T, height: ov.H, "--h": ov.hue }}
            >
              <div className="fb-book">
                <div
                  className="fb-face fb-spine rk-look"
                  style={{ width: ov.T, height: ov.H, transform: `translateZ(${D / 2}px)` }}
                >
                  <PunggungIsi it={ov} />
                </div>
                <div
                  className="fb-face fb-edge"
                  style={{ width: ov.T, height: ov.H, transform: `rotateY(180deg) translateZ(${D / 2}px)` }}
                />
                <div
                  className="fb-face cv"
                  style={{
                    width: D,
                    height: ov.H,
                    left: (ov.T - D) / 2,
                    "--u": `${D / 16}px`,
                    transform: `rotateY(90deg) translateZ(${ov.T / 2}px)`,
                  }}
                >
                  <SampulIsi it={ov} />
                </div>
                <div
                  className="fb-face fb-back"
                  style={{
                    width: D,
                    height: ov.H,
                    left: (ov.T - D) / 2,
                    transform: `rotateY(-90deg) translateZ(${ov.T / 2}px)`,
                  }}
                />
                <div
                  className="fb-face fb-edge"
                  style={{ width: ov.T, height: D, top: (ov.H - D) / 2, transform: `rotateX(90deg) translateZ(${ov.H / 2}px)` }}
                />
                <div
                  className="fb-face fb-edge"
                  style={{ width: ov.T, height: D, top: (ov.H - D) / 2, transform: `rotateX(-90deg) translateZ(${ov.H / 2}px)` }}
                />
              </div>

              <div className="fb-open" style={{ width: D, height: ov.H, left: (ov.T - D) / 2, "--u": `${D / 16}px` }}>
                <div className="fb-page">
                  <small>Daftar isi</small>
                  <h4>{ov.nama}</h4>
                  <ul>
                    {halaman.slice(0, 7).map((b) => (
                      <li key={b.id_buku}>{b.judul}</li>
                    ))}
                  </ul>
                  {halaman.length > 7 && <em>+{halaman.length - 7} buku lainnya</em>}
                  {halaman.length === 0 && <em>{ov.jumlah} buku…</em>}
                </div>
                <div className="fb-cover">
                  <div className="fb-cv-front cv">
                    <SampulIsi it={ov} />
                  </div>
                  <div className="fb-cv-back">
                    <small>Rak kategori</small>
                    <b>{ov.jumlah}</b>
                    <span>buku tersedia</span>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===== Lapisan animasi: buku dikembalikan ke rak ===== */}
      {kembali &&
        createPortal(
          <div className="fb-stage" ref={retRef} aria-hidden="true" onClick={() => tlRef.current?.timeScale(4)}>
            <div className="fb-dim rt-dim" />
            <div
              className="rt-fly rk-look"
              style={{
                position: "absolute",
                visibility: "hidden",
                width: kembali.it.T,
                height: kembali.it.H,
                "--h": kembali.it.hue,
              }}
            >
              <PunggungIsi it={kembali.it} />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}