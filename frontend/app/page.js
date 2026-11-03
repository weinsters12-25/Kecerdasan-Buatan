"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  Search,
  ListFilter,
  X,
  Info,
  User,
  Building,
  Calendar,
  FileText,
  ArrowRight,
  Check,
  ChevronDown,
} from "lucide-react";

/* ---------- Helper tampilan (tidak menyentuh logika data) ---------- */
const CONTOH_KATA_KUNCI = [
  "belajar koding python",
  "kecerdasan buatan",
  "manajemen bisnis",
  "jurnal pendidikan",
];

const TINGGI_RAK = [62, 80, 70, 92, 66, 84, 74, 58, 88, 72];

// Warna sampul dibuat konsisten dari nama kategori
const hueDariTeks = (teks = "") => {
  let h = 0;
  for (const ch of teks) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

const PLACEHOLDER = [
  "saya ingin belajar koding python",
  "buku tentang kecerdasan buatan",
  "jurnal metode penelitian kuantitatif",
  "strategi memulai bisnis kecil",
];

const chipsVar = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const chipVar = {
  hidden: { opacity: 0, y: 10, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1 },
};

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

const Sampul = ({ buku }) => (
  <div className="cover" style={{ "--h": hueDariTeks(buku.kategori) }} aria-hidden="true">
    {(buku.judul || "?").charAt(0).toUpperCase()}
  </div>
);

const Lingkaran = ({ skor, persen }) => {
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
};

export default function Home() {
  const [mode, setMode] = useState("text");
  const [daftarBuku, setDaftarBuku] = useState([]);
  const [idBuku, setIdBuku] = useState("");
  const [inputTeks, setInputTeks] = useState("");
  const [hasil, setHasil] = useState(null);
  const [loading, setLoading] = useState(false);

  // State untuk Pop-up Modal Detail Buku
  const [selectedBookDetail, setSelectedBookDetail] = useState(null);

  // State tambahan khusus tampilan form
  const [fokus, setFokus] = useState(false);
  const [phIdx, setPhIdx] = useState(0);
  const inputRef = useRef(null);
  const kontrol = useAnimation();

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/buku")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDaftarBuku(data);
          setIdBuku(data[0].id_buku.toString());
        }
      })
      .catch((err) => console.error("Gagal memuat daftar buku", err));
  }, []);

  const handleCari = async () => {
    setLoading(true);
    try {
      let res, data;
      if (mode === "dropdown") {
        res = await fetch(`http://127.0.0.1:8000/api/rekomendasi/${idBuku}`);
        data = await res.json();
      } else {
        if (!inputTeks.trim()) {
          alert("Masukkan kata kunci pencarian!");
          setLoading(false);
          return;
        }
        res = await fetch("http://127.0.0.1:8000/api/rekomendasi/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teks: inputTeks }),
        });
        data = await res.json();
      }
      setHasil(data);
    } catch (error) {
      alert("Gagal terhubung ke server Python! Pastikan Uvicorn sudah berjalan.");
    } finally {
      setLoading(false);
    }
  };

  // Placeholder berganti otomatis
  useEffect(() => {
    const t = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDER.length), 3200);
    return () => clearInterval(t);
  }, []);

  // Tekan "/" untuk langsung mengetik
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Bungkus handleCari: getarkan kolom jika kosong, lalu jalankan logika asli
  const kirim = () => {
    if (mode === "text" && !inputTeks.trim()) {
      kontrol.start({ x: [0, -9, 9, -6, 6, 0], transition: { duration: 0.4 } });
    }
    handleCari();
  };

  const pilihContoh = (k) => {
    setInputTeks(k);
    inputRef.current?.focus();
  };

  const terpilihAktif = daftarBuku.find((b) => String(b.id_buku) === String(idBuku));
  const aktif = fokus || loading;

  // Tutup modal dengan tombol Esc + kunci scroll halaman saat modal terbuka
  useEffect(() => {
    if (!selectedBookDetail) return;
    const onKey = (e) => e.key === "Escape" && setSelectedBookDetail(null);
    window.addEventListener("keydown", onKey);
    const lama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = lama;
    };
  }, [selectedBookDetail]);

  const ganti = (m) => {
    setMode(m);
    setHasil(null);
  };

  return (
    <div className="app">
      <div className="wrap">
        {/* ===== Header ===== */}
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">
              <BookOpen size={20} />
            </span>
            Pustaka Pintar
          </div>
          <span className="badge">Gemini + TF-IDF</span>
        </header>

        {/* ===== Hero + Pencarian ===== */}
        <section className="hero">
          <div>
            <h1>Temukan bacaan yang nyambung dengan minatmu.</h1>
            <p className="lead">
              Ketik topik atau pilih satu buku. Sistem mencari buku dan jurnal lain yang
              isinya paling berkaitan.
            </p>

            <div className="shelf" aria-hidden="true">
              {TINGGI_RAK.map((h, i) => (
                <span key={i} className="spine" style={{ "--h": h, "--i": i }} />
              ))}
            </div>
          </div>

          <motion.div
            className="panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <div className="tabs" role="tablist" aria-label="Cara mencari">
              <button
                role="tab"
                aria-selected={mode === "text"}
                className="tab"
                onClick={() => ganti("text")}
              >
                {mode === "text" && (
                  <motion.span
                    layoutId="pill"
                    className="tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Search size={16} /> Ketik topik
              </button>
              <button
                role="tab"
                aria-selected={mode === "dropdown"}
                className="tab"
                onClick={() => ganti("dropdown")}
              >
                {mode === "dropdown" && (
                  <motion.span
                    layoutId="pill"
                    className="tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <ListFilter size={16} /> Pilih buku
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
                          <motion.kbd
                            key="k"
                            className="kbd"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
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
                  key="chips"
                  className="chips"
                  variants={chipsVar}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0 }}
                >
                  {CONTOH_KATA_KUNCI.map((k) => (
                    <motion.button
                      key={k}
                      type="button"
                      className="chip"
                      variants={chipVar}
                      whileHover={{ y: -3, scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => pilihContoh(k)}
                    >
                      <Sparkles size={13} /> {k}
                    </motion.button>
                  ))}
                </motion.div>
              ) : (
                <motion.p
                  key="hint"
                  className="hint"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {terpilihAktif
                    ? `Sistem akan mencari bacaan lain yang paling mirip dengan buku kategori ${terpilihAktif.kategori}.`
                    : "Pilih satu buku sebagai acuan rekomendasi."}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* ===== Hasil ===== */}
        <section className="results" aria-live="polite">
          {loading && (
            <div className="grid" aria-label="Memuat hasil">
              {[0, 1, 2, 3].map((n) => (
                <div key={n} className="skeleton" />
              ))}
            </div>
          )}

          {!loading && !hasil && (
            <div className="empty">
              Hasil rekomendasi akan muncul di sini. Mulai dengan mengetik topik atau
              memilih buku.
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
                <div className="banner">
                  <CheckCircle2 size={20} />
                  <strong>{hasil.buku_acuan}</strong>
                </div>

                <div className="res-head">
                  <h2>Rekomendasi terkait</h2>
                  <span>Ketuk kartu untuk melihat detail</span>
                </div>

                <div className="grid">
                  {hasil.rekomendasi &&
                    hasil.rekomendasi.map((buku, index) => {
                      const persentase = (buku.skor_kemiripan * 100).toFixed(0);

                      return (
                        <motion.button
                          key={buku.id_buku}
                          className="item"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.07 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedBookDetail(buku)}
                        >
                          <Sampul buku={buku} />
                          <div className="item-body">
                            <h3>{buku.judul}</h3>
                            <span className="tag">{buku.kategori}</span>
                          </div>
                          <Lingkaran skor={buku.skor_kemiripan} persen={persentase} />
                        </motion.button>
                      );
                    })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <footer className="footer">
        <div className="wrap">Rekomendasi dihitung dari kemiripan isi dokumen (NLP).</div>
      </footer>

      {/* ===== MODAL DETAIL BUKU ===== */}
      <AnimatePresence>
        {selectedBookDetail && (
          <motion.div
            className="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBookDetail(null)}
          >
            <motion.div
              className="sheet"
              role="dialog"
              aria-modal="true"
              aria-label={selectedBookDetail.judul}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sheet-head">
                <Sampul buku={selectedBookDetail} />
                <div>
                  <span className="tag" style={{ marginTop: 0 }}>
                    {selectedBookDetail.kategori}
                  </span>
                  <h2 style={{ marginTop: 8 }}>{selectedBookDetail.judul}</h2>
                </div>
                <button
                  className="icon-btn"
                  aria-label="Tutup detail"
                  onClick={() => setSelectedBookDetail(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="meta">
                <div className="meta-item">
                  <User size={18} />
                  <div>
                    <small>Penulis</small>
                    <strong>{selectedBookDetail.penulis || "-"}</strong>
                  </div>
                </div>
                <div className="meta-item">
                  <Building size={18} />
                  <div>
                    <small>Penerbit</small>
                    <strong>{selectedBookDetail.penerbit || "-"}</strong>
                  </div>
                </div>
                <div className="meta-item">
                  <Calendar size={18} />
                  <div>
                    <small>Tahun terbit</small>
                    <strong>{selectedBookDetail.tahun_terbit || "-"}</strong>
                  </div>
                </div>
                <div className="meta-item">
                  <FileText size={18} />
                  <div>
                    <small>Jumlah halaman</small>
                    <strong>
                      {selectedBookDetail.jumlah_halaman
                        ? `${selectedBookDetail.jumlah_halaman} hal.`
                        : "-"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="desc-title">
                <Info size={16} /> Deskripsi
              </div>
              <p className="desc">
                {selectedBookDetail.deskripsi || "Tidak ada deskripsi tersedia."}
              </p>

              <button className="btn block" onClick={() => setSelectedBookDetail(null)}>
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}