"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CornerDownLeft,
  Heart,
  Home,
  Library,
  Network,
  Search,
  Sparkles,
} from "lucide-react";
import BookCover from "./BookCover";
import { getBuku, getKategori, hueDariTeks } from "../lib/api";

const HALAMAN = [
  { label: "Beranda", href: "/", Ikon: Home },
  { label: "Katalog", href: "/katalog", Ikon: BookOpen },
  { label: "Peta kemiripan", href: "/peta", Ikon: Network },
  { label: "Daftar saya", href: "/daftar-saya", Ikon: Heart },
];

const MAKS_BUKU = 10;

export default function CommandPalette() {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [q, setQ] = useState("");
  const [aktif, setAktif] = useState(0);
  const [data, setData] = useState({ buku: [], kat: [] });
  const [status, setStatus] = useState("idle"); // idle | memuat | siap | gagal
  const listRef = useRef(null);

  // Ctrl/Cmd + K, atau event dari tombol di header
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuka((o) => !o);
      }
    };
    const onBuka = () => setBuka(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("buka-palet", onBuka);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("buka-palet", onBuka);
    };
  }, []);

  // Saat dibuka: reset, kunci scroll, dan muat data (kategori dulu agar warna terdaftar)
  useEffect(() => {
    if (!buka) return;
    setQ("");
    setAktif(0);
    const lama = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (status === "idle" || status === "gagal") {
      setStatus("memuat");
      getKategori()
        .then((kat) =>
          getBuku()
            .then((buku) => ({ kat, buku }))
            .catch(() => ({ kat, buku: [] }))
        )
        .then(({ kat, buku }) => {
          setData({
            kat: Array.isArray(kat) ? kat : [],
            buku: Array.isArray(buku) ? buku : [],
          });
          setStatus("siap");
        })
        .catch(() => setStatus("gagal"));
    }

    return () => {
      document.body.style.overflow = lama;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buka]);

  const daftar = useMemo(() => {
    const k = q.trim().toLowerCase();
    const cocok = (...t) => !k || t.join(" ").toLowerCase().includes(k);
    const out = [];

    HALAMAN.filter((h) => cocok(h.label)).forEach((h) =>
      out.push({ grup: "Halaman", label: h.label, href: h.href, Ikon: h.Ikon })
    );

    // Semua kategori yang tersedia (dinamis dari server), tanpa batas jumlah
    data.kat
      .filter((c) => c.nama && cocok(c.nama))
      .forEach((c) =>
        out.push({
          grup: "Kategori",
          label: c.nama,
          sub: `${c.jumlah} buku`,
          href: `/katalog?kategori=${encodeURIComponent(c.nama)}`,
          Ikon: Library,
          hue: hueDariTeks(c.nama),
        })
      );

    if (k) {
      data.buku
        .filter((b) => cocok(b.judul, b.penulis, b.kategori))
        .slice(0, MAKS_BUKU)
        .forEach((b) =>
          out.push({
            grup: "Buku",
            label: b.judul,
            sub: `${b.penulis} · ${b.kategori}`,
            href: `/buku/${b.id_buku}`,
            buku: b,
          })
        );
      out.push({
        grup: "Rekomendasi AI",
        label: `Cari rekomendasi untuk “${q.trim()}”`,
        href: `/hasil?q=${encodeURIComponent(q.trim())}`,
        Ikon: Sparkles,
      });
    }
    return out;
  }, [q, data]);

  // Jumlah item per grup untuk label header
  const jumlahGrup = useMemo(() => {
    const m = {};
    daftar.forEach((d) => {
      m[d.grup] = (m[d.grup] || 0) + 1;
    });
    return m;
  }, [daftar]);

  // Pastikan item aktif selalu terlihat
  useEffect(() => {
    listRef.current?.querySelector('[data-aktif="true"]')?.scrollIntoView({ block: "nearest" });
  }, [aktif, daftar]);

  const bukaItem = (item) => {
    if (!item) return;
    setBuka(false);
    router.push(item.href);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      setBuka(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setAktif((i) => (daftar.length ? (i + 1) % daftar.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktif((i) => (daftar.length ? (i - 1 + daftar.length) % daftar.length : 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      setAktif(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setAktif(Math.max(daftar.length - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      bukaItem(daftar[aktif]);
    }
  };

  let grupSebelum = "";

  return (
    <AnimatePresence>
      {buka && (
        <motion.div
          className="pl-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={() => setBuka(false)}
        >
          <motion.div
            className="pl"
            role="dialog"
            aria-modal="true"
            aria-label="Pencarian cepat"
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 480, damping: 34 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="pl-input">
              <Search size={18} />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setAktif(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Cari judul, penulis, kategori, atau halaman…"
                aria-label="Cari"
              />
              <kbd className="kbd" style={{ display: "inline-block" }}>
                Esc
              </kbd>
            </div>

            <div className="pl-list" ref={listRef} role="listbox">
              {status === "memuat" && daftar.length <= HALAMAN.length && (
                <div className="pl-kosong">Memuat kategori…</div>
              )}
              {status === "gagal" && (
                <div className="pl-kosong">
                  Gagal memuat data. Pastikan server berjalan, lalu buka ulang pencarian.
                </div>
              )}
              {status === "siap" && daftar.length === 0 && (
                <div className="pl-kosong">Tidak ada hasil.</div>
              )}

              {daftar.map((it, i) => {
                const header = it.grup !== grupSebelum;
                grupSebelum = it.grup;
                const Ikon = it.Ikon;
                return (
                  <div key={`${it.grup}-${it.href}-${i}`}>
                    {header && (
                      <div className="pl-grup">
                        {it.grup} <span>({jumlahGrup[it.grup]})</span>
                      </div>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === aktif}
                      data-aktif={i === aktif}
                      className="pl-item"
                      onMouseMove={() => i !== aktif && setAktif(i)}
                      onClick={() => bukaItem(it)}
                    >
                      {it.buku ? (
                        <BookCover buku={it.buku} size="xs" />
                      ) : (
                        <span
                          className={`pl-ikon${it.hue !== undefined ? " warna" : ""}`}
                          style={it.hue !== undefined ? { "--h": it.hue } : undefined}
                        >
                          {Ikon && <Ikon size={18} />}
                        </span>
                      )}
                      <span className="pl-teks">
                        <strong>{it.label}</strong>
                        {it.sub && <small>{it.sub}</small>}
                      </span>
                      {i === aktif && <CornerDownLeft size={15} className="pl-enter" />}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="pl-foot">
              <span>
                <kbd className="kbd" style={{ display: "inline-block" }}>
                  ↑↓
                </kbd>{" "}
                pilih
              </span>
              <span>
                <kbd className="kbd" style={{ display: "inline-block" }}>
                  Enter
                </kbd>{" "}
                buka
              </span>
              <span>
                <kbd className="kbd" style={{ display: "inline-block" }}>
                  Ctrl K
                </kbd>{" "}
                tutup / buka
              </span>
              {status === "siap" && (
                <span className="pl-total">{data.kat.length} kategori · {data.buku.length} buku</span>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}