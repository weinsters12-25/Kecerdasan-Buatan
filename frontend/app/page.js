"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  Search,
  X,
  Info,
  ArrowRight,
  Check,
  ChevronDown,
  Lightbulb,
  PenLine,
  Brain,
  ScanSearch,
  Trophy,
  RotateCw,
  Keyboard,
  LibraryBig,
  Network,
} from "lucide-react";
import PageShell from "./components/PageShell";
import BookCard from "./components/BookCard";
import RakKategori from "./components/RakKategori";
import Reveal from "./components/Reveal";
import Magnetic from "./components/Magnetic";
import Marquee from "./components/Marquee";
import RakHero from "./components/RakHero";
import ModeSwitch from "./components/ModeSwitch";
import StatCards from "./components/StatCards";
import { gsap, useGSAP, SplitText, bolehAnimasi } from "./lib/gsap";
import {
  cariTeks,
  getBuku,
  getKategori,
  getRekomendasiAcuan,
  getTerbaik,
  hueDariTeks,
} from "./lib/api";
import GlitchBadge from "./components/GlitchBadge";

const PLACEHOLDER = [
  "saya ingin belajar koding python",
  "buku tentang kecerdasan buatan",
  "jurnal metode penelitian kuantitatif",
  "strategi memulai bisnis kecil",
];

/* Dropdown buku kustom: bisa dicari, animasi buka-tutup */
function PilihBuku({ daftar, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const terpilih = daftar.find((b) => String(b.id_buku) === String(value));
  const tersaring = daftar.filter((b) =>
    `${b.judul} ${b.kategori}`.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div ref={ref} style={{ flex: 1, minWidth: 0 }}>
      <button
        type="button"
        className="dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={daftar.length === 0}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dot" style={{ "--h": hueDariTeks(terpilih?.kategori) }} />
        <span className="t">
          <strong>{terpilih ? terpilih.judul : "Memuat daftar buku…"}</strong>
          {terpilih && <small>{terpilih.kategori}</small>}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: "flex" }}>
          <ChevronDown size={20} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="dd-pop"
            initial={{ opacity: 0, y: -8, scaleY: 0.92 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className="dd-search">
              <Search size={16} />
              <input
                autoFocus
                placeholder="Cari judul atau kategori…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <ul className="dd-list" role="listbox">
              {tersaring.length === 0 && <li className="dd-none">Buku tidak ditemukan.</li>}
              {tersaring.map((b, i) => (
                <motion.li
                  key={b.id_buku}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.025 }}
                >
                  <button
                    type="button"
                    role="option"
                    className="dd-opt"
                    aria-selected={String(b.id_buku) === String(value)}
                    onClick={() => {
                      onChange(b.id_buku.toString());
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <span className="dot" style={{ "--h": hueDariTeks(b.kategori) }} />
                    <span className="txt">
                      <strong>{b.judul}</strong>
                      <small>{b.kategori}</small>
                    </span>
                    {String(b.id_buku) === String(value) && <Check size={16} color="var(--accent)" />}
                  </button>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState("text"); // cara mencari: "text" | "dropdown"
  const [mesin, setMesin] = useState("hybrid"); // mesin pencarian: "hybrid" | "tfidf"
  const [devTampil, setDevTampil] = useState(false); // panel mode mesin (tersembunyi)
  const [daftarBuku, setDaftarBuku] = useState([]);
  const [daftarKat, setDaftarKat] = useState([]);
  const [terbaik, setTerbaik] = useState({ judul: "", subjudul: "", buku: [] });
  const [idBuku, setIdBuku] = useState("");
  const [inputTeks, setInputTeks] = useState("");
  const [hasil, setHasil] = useState(null);
  const [linkSemua, setLinkSemua] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [fokus, setFokus] = useState(false);
  const [phIdx, setPhIdx] = useState(0);
  const inputRef = useRef(null);
  const kontrol = useAnimation();

  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const hasilRef = useRef(null);
  const reqId = useRef(0);
  const perluGulir = useRef(false);

  useEffect(() => {
    // kategori dimuat dulu agar warna tiap kategori sudah terdaftar
    getKategori()
      .then(setDaftarKat)
      .catch(() => {})
      .finally(() => {
        getBuku()
          .then((data) => {
            if (Array.isArray(data) && data.length > 0) {
              setDaftarBuku(data);
              setIdBuku(data[0].id_buku.toString());
            }
          })
          .catch((err) => console.error("Gagal memuat daftar buku", err));
      });
    getTerbaik()
  .then((d) => d && Array.isArray(d.buku) && setTerbaik(d))
  .catch(() => {});
  }, []);

  /* ===== Animasi GSAP: hero ===== */
  useGSAP(
    () => {
      gsap.set(titleRef.current, { opacity: 1 });
      if (!bolehAnimasi()) return;

      SplitText.create(titleRef.current, {
        type: "lines,words",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.words, { yPercent: 115, duration: 1, ease: "expo.out", stagger: 0.07 }),
      });

      gsap.from(".gb-wrap", { y: 20, autoAlpha: 0, duration: 0.7, ease: "power3.out" });
      gsap.from(".lead", { y: 24, autoAlpha: 0, duration: 0.8, delay: 0.55, ease: "power3.out" });
    },
    { scope: heroRef }
  );

  const handleCari = async (opsi = {}) => {
    const tipe = opsi.tipe ?? mode;
    const id = ++reqId.current;
    setLoading(true);
    setError("");
    try {
      let data;
      if (tipe === "dropdown") {
        data = await getRekomendasiAcuan(idBuku);
        setLinkSemua(`/hasil?acuan=${idBuku}`);
      } else {
        const teks = (opsi.teks ?? inputTeks).trim();
        data = await cariTeks(teks);
        setLinkSemua(`/hasil?${new URLSearchParams({ q: teks }).toString()}`);
      }
      if (id !== reqId.current) return;
      if (data.error) {
        setError(data.error);
        setHasil(null);
      } else {
        setHasil(data);
      }
    } catch {
      if (id !== reqId.current) return;
      setError("Tidak bisa terhubung ke server. Pastikan Uvicorn berjalan di port 8000, lalu coba lagi.");
      setHasil(null);
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  };

  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDER.length), 3200);
    return () => clearInterval(t);
  }, []);

  /* Pintasan keyboard:
     "/"            -> fokus ke kolom pencarian
     Alt+Shift+M    -> tampil/sembunyikan panel mode mesin
     Esc            -> tutup panel mode mesin */
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey && e.shiftKey && e.code === "KeyM") {
        e.preventDefault();
        setDevTampil((v) => !v);
        return;
      }
      const tag = document.activeElement?.tagName;
      const mengetik = ["INPUT", "TEXTAREA", "SELECT"].includes(tag);
      if (e.key === "Escape" && !mengetik) {
        setDevTampil(false);
        return;
      }
      if (e.key === "/" && !mengetik) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!loading && hasil && perluGulir.current) {
      perluGulir.current = false;
      hasilRef.current?.scrollIntoView({
        behavior: bolehAnimasi() ? "smooth" : "auto",
        block: "start",
      });
    }
  }, [loading, hasil]);

  const kirim = () => {
    if (mode === "text" && !inputTeks.trim()) {
      kontrol.start({ x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.4 } });
      inputRef.current?.focus();
      return;
    }
    if (mode === "dropdown" && !idBuku) return;
    perluGulir.current = true;
    handleCari();
  };

  const ganti = (m) => {
    setMode(m);
    setHasil(null);
    setError("");
  };

  // Mesin diganti: ulangi pencarian yang sedang tampil agar hasilnya ikut berubah
  const gantiMesin = (m) => {
    setMesin(m);
    const adaQuery = mode === "dropdown" ? !!idBuku : !!inputTeks.trim();
    if (hasil && adaQuery) handleCari();
  };

  const terpilihAktif = daftarBuku.find((b) => String(b.id_buku) === String(idBuku));
  const aktif = fokus || loading;
  const top = hasil?.rekomendasi || [];
  const adaSisa = (hasil?.terkait_lainnya?.length || 0) > 0;
  const LangkahDua = mesin === "hybrid" ? Brain : ScanSearch;

  // Kartu "rekomendasi terbaik": ke hasil pencarian bila ada, jika tidak ke pilihan terbaik
  const tujuanTerbaik = top.length > 0 ? "hasil" : "terbaik";

  return (
    <PageShell>
      {/* ===== Hero ===== */}
      <section className="hero" ref={heroRef}>
        <div className="hero-copy">
<GlitchBadge />
          <h1 className="hero-title" ref={titleRef}>
            Temukan bacaan yang nyambung dengan <span className="hl">minatmu.</span>
          </h1>
          <p className="lead">
            Ketik topik atau pilih satu buku. Sistem mencari buku dan jurnal lain yang isinya
            paling berkaitan.
          </p>

          <StatCards
            total={daftarBuku.length}
            kategori={daftarKat}
            tujuanTerbaik={tujuanTerbaik}
          />
        </div>

        <RakHero buku={daftarBuku} />
      </section>

      <Marquee items={daftarKat.map((k) => k.nama)} />

      {/* ===== Pencarian ===== */}
      <section className="search-section" id="cari" style={{ scrollMarginTop: 24 }}>
        <div className="search-copy">
          <h2>Cari bacaan berikutnya</h2>
          <p>
            Tulis dengan bahasa sehari-hari. Sistem memahami maksudmu, bukan sekadar mencocokkan
            kata.
          </p>

          <ol className="how">
            <li>
              <span className="how-ic">
                <PenLine size={18} />
              </span>
              <div>
                <strong>Tulis bebas</strong>
                <span>Boleh singkat, santai, bahkan salah ketik.</span>
              </div>
            </li>
            <li>
              <span className="how-ic">
                <LangkahDua size={18} />
              </span>
              <div>
                <strong>{mesin === "hybrid" ? "AI memahami topik" : "Sistem mencocokkan kata"}</strong>
                <span>
                  {mesin === "hybrid"
                    ? "Gemini menerjemahkan kalimatmu menjadi topik buku."
                    : "Kata kunci dicocokkan dengan judul dan sinopsis buku."}
                </span>
              </div>
            </li>
            <li>
              <span className="how-ic">
                <Trophy size={18} />
              </span>
              <div>
                <strong>Dapat 3 terbaik</strong>
                <span>Lengkap dengan daftar buku lain yang berkaitan.</span>
              </div>
            </li>
          </ol>
        </div>

        <motion.div
          className="panel"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <div className="tabs" role="tablist" aria-label="Cara mencari">
            <button role="tab" aria-selected={mode === "text"} className="tab" onClick={() => ganti("text")}>
              {mode === "text" && (
                <motion.span layoutId="pill" className="tab-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <Keyboard size={16} /> Ketik topik
            </button>
            <button role="tab" aria-selected={mode === "dropdown"} className="tab" onClick={() => ganti("dropdown")}>
              {mode === "dropdown" && (
                <motion.span layoutId="pill" className="tab-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <LibraryBig size={16} /> Pilih buku
            </button>
          </div>

          <motion.div className="composer" animate={kontrol}>
            <div className="composer-ring">
              <motion.div
                className="composer-glow"
                animate={{ rotate: 360, opacity: aktif ? 1 : 0.3 }}
                transition={{
                  rotate: { repeat: Infinity, ease: "linear", duration: loading ? 2.5 : 8 },
                  opacity: { duration: 0.3 },
                }}
              />
            </div>

            <div className="composer-inner">
              <AnimatePresence mode="wait" initial={false}>
                {mode === "text" ? (
                  <motion.div
                    key="t"
                    className="slot"
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 14 }}
                    transition={{ duration: 0.18 }}
                  >
                    <motion.span
                      className="lead-ic"
                      style={{ display: "flex" }}
                      animate={{ scale: fokus ? 1.15 : 1, rotate: fokus ? -8 : 0 }}
                    >
                      <Search size={20} />
                    </motion.span>

                    <div className="input-wrap">
                      <input
                        ref={inputRef}
                        type="text"
                        aria-label="Kata kunci atau topik"
                        value={inputTeks}
                        onChange={(e) => setInputTeks(e.target.value)}
                        onFocus={() => setFokus(true)}
                        onBlur={() => setFokus(false)}
                        onKeyDown={(e) => e.key === "Enter" && kirim()}
                      />
                      {!inputTeks && (
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={phIdx}
                            className="ph"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                          >
                            Coba: {PLACEHOLDER[phIdx]}
                          </motion.span>
                        </AnimatePresence>
                      )}
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                      {inputTeks ? (
                        <motion.button
                          key="x"
                          type="button"
                          className="icon-btn sm"
                          aria-label="Hapus teks"
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => {
                            setInputTeks("");
                            inputRef.current?.focus();
                          }}
                        >
                          <X size={15} />
                        </motion.button>
                      ) : (
                        <motion.kbd key="k" className="kbd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          /
                        </motion.kbd>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div
                    key="d"
                    className="slot"
                    initial={{ opacity: 0, x: 14 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -14 }}
                    transition={{ duration: 0.18 }}
                  >
                    <PilihBuku daftar={daftarBuku} value={idBuku} onChange={setIdBuku} />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                className="btn go"
                onClick={kirim}
                disabled={loading}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                variants={{ rest: { scale: 1 }, hover: { scale: 1.04 }, tap: { scale: 0.95 } }}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Mencari…
                  </>
                ) : (
                  <>
                    Cari
                    <motion.span variants={{ rest: { x: 0 }, hover: { x: 4 } }}>
                      <ArrowRight size={18} />
                    </motion.span>
                  </>
                )}
              </motion.button>

              <div className="bar-clip">
                {loading && (
                  <motion.span
                    className="bar"
                    animate={{ x: ["-100%", "350%"] }}
                    transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
                  />
                )}
              </div>
            </div>
          </motion.div>

          <AnimatePresence mode="wait" initial={false}>
            {mode === "text" ? (
              <motion.div
                key="tips"
                className="tips"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Lightbulb size={17} />
                <p>
                  Tulis seperti bicara biasa, misalnya <em>“aku mau belajar bikin aplikasi web”</em>.
                  Tekan <kbd className="kbd">/</kbd> kapan saja untuk langsung mengetik.
                </p>
              </motion.div>
            ) : (
              <motion.p key="hint" className="hint" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {terpilihAktif
                  ? `Sistem akan mencari bacaan lain yang paling mirip dengan “${terpilihAktif.judul}”.`
                  : "Pilih satu buku sebagai acuan rekomendasi."}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Tersembunyi. Muncul hanya setelah menekan Alt + Shift + M */}
          <ModeSwitch tampil={devTampil} onTutup={() => setDevTampil(false)} onReady={setMesin} onChange={gantiMesin} />
        </motion.div>
      </section>

      {/* ===== Hasil pencarian ===== */}
      <section
        className="results"
        id="hasil"
        aria-live="polite"
        aria-busy={loading}
        ref={hasilRef}
        style={{ scrollMarginTop: 24 }}
      >
        {loading && (
          <div className="grid" aria-label="Memuat hasil">
            {[0, 1, 2].map((n) => (
              <div key={n} className="skeleton" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="empty">
            <p>{error}</p>
            <div className="more">
              <button type="button" className="btn" onClick={() => handleCari()}>
                <RotateCw size={16} /> Coba lagi
              </button>
            </div>
          </div>
        )}

        {!loading && !error && !hasil && (
          <div className="empty">
            Hasil rekomendasi akan muncul di sini. Ketik topik atau pilih satu buku, lalu tekan Cari.
          </div>
        )}

        <AnimatePresence mode="wait">
          {!loading && hasil && (
            <motion.div
              key="hasil"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <div className={`banner${top.length === 0 ? " warn" : ""}`}>
                {top.length === 0 ? <Info size={20} /> : <CheckCircle2 size={20} />}
                <strong>{hasil.buku_acuan}</strong>
              </div>

              {top.length > 0 && (
                <>
                  <div className="res-head">
                    <h2>3 rekomendasi terbaik</h2>
                    <span>Ketuk kartu untuk melihat detail</span>
                  </div>
                  <Reveal className="grid" deps={[top]}>
                    {top.map((b, i) => (
                      <BookCard key={b.id_buku} buku={b} rank={i + 1} />
                    ))}
                  </Reveal>

                  {adaSisa && (
                    <div className="more">
                      <Magnetic>
                        <Link href={linkSemua} className="btn">
                          Lihat semua {hasil.total_terkait} buku berkaitan <ArrowRight size={16} />
                        </Link>
                      </Magnetic>
                    </div>
                  )}
                </>
              )}

              {top.length === 0 && (
                <div className="empty">
                  <p>
                    Perpustakaan ini belum punya bacaan untuk topik tersebut. Coba kata kunci lain,
                    atau jelajahi rak kategori di bawah.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ===== Pilihan terbaik perpustakaan ===== */}
      {terbaik.buku.length > 0 && (
  <section className="results terbaik" id="terbaik" style={{ paddingTop: 0, scrollMarginTop: 24 }}>
    <div className="res-head">
      <div>
        <h2>
          <Trophy size={20} style={{ verticalAlign: "-3px", color: "var(--accent)" }} />{" "}
          {terbaik.judul || "Pilihan terbaik perpustakaan"}
        </h2>
        <p className="res-sub">
          {terbaik.subjudul ||
            "Buku yang isinya paling banyak berkaitan dengan koleksi lain, cocok sebagai titik awal membaca."}
        </p>
      </div>
      <Link href="/peta" className="link-more">
        <Network size={14} style={{ verticalAlign: "-2px" }} /> Lihat di peta →
      </Link>
    </div>
    <Reveal className="grid" deps={[terbaik]}>
      {terbaik.buku.map((b, i) => (
        <BookCard key={b.id_buku} buku={b} rank={i + 1} />
      ))}
    </Reveal>
  </section>
)}

      {/* ===== Rak kategori ===== */}
      {daftarKat.length > 0 && (
        <section className="results" id="rak-kategori" style={{ paddingTop: 0, scrollMarginTop: 24 }}>
          <div className="res-head">
            <h2>Rak kategori</h2>
            <Link href="/katalog" className="link-more">
              Lihat katalog lengkap →
            </Link>
          </div>
          <RakKategori kategori={daftarKat} />
        </section>
      )}
    </PageShell>
  );
}