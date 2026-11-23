"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Info, ArrowLeft } from "lucide-react";
import PageShell from "../components/PageShell";
import BookCard from "../components/BookCard";
import { cariTeks, getKategori, getRekomendasiAcuan } from "../lib/api";
import Reveal from "../components/Reveal";

function HasilIsi() {
  const sp = useSearchParams();
  const router = useRouter();
  const q = sp.get("q") || "";
  const kategori = sp.get("kategori") || "";
  const acuan = sp.get("acuan") || "";
  const kunci = `${q}|${kategori}|${acuan}`;

  const [state, setState] = useState({ kunci: "", data: null, error: "" });
  const [daftarKat, setDaftarKat] = useState([]);

  useEffect(() => {
    getKategori().then(setDaftarKat).catch(() => {});
  }, []);

  useEffect(() => {
    if (!q && !acuan) return;
    let batal = false;
    const minta = acuan ? getRekomendasiAcuan(acuan) : cariTeks(q, kategori || null);
    minta
      .then((d) => !batal && setState({ kunci, data: d, error: d.error || "" }))
      .catch(
        () =>
          !batal &&
          setState({ kunci, data: null, error: "Gagal terhubung ke server Python! Pastikan Uvicorn berjalan." })
      );
    return () => {
      batal = true;
    };
  }, [kunci, q, acuan, kategori]);

  const loading = (q || acuan) && state.kunci !== kunci;
  const { data, error } = state;
  const top = data?.rekomendasi || [];
  const sisa = data?.terkait_lainnya || [];

  const pilihKategori = (nama) => {
    const p = new URLSearchParams({ q });
    if (nama) p.set("kategori", nama);
    router.replace(`/hasil?${p.toString()}`, { scroll: false });
  };

  if (!q && !acuan) {
    return (
      <div className="empty">
        <p>Belum ada pencarian.</p>
        <Link href="/" className="btn" style={{ marginTop: 12 }}>
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <section className="results">
      <Link href="/" className="back">
        <ArrowLeft size={16} /> Beranda
      </Link>

      {/* Filter kategori hanya untuk pencarian teks */}
      {q && daftarKat.length > 0 && (
        <div className="filters" role="group" aria-label="Batasi kategori">
          <button type="button" className="fchip" aria-pressed={!kategori} onClick={() => pilihKategori("")}>
            Semua kategori
          </button>
          {daftarKat.map((k) => (
            <button
              key={k.nama}
              type="button"
              className="fchip"
              aria-pressed={kategori === k.nama}
              onClick={() => pilihKategori(k.nama)}
            >
              {k.nama}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid" aria-label="Memuat hasil">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="skeleton" />
          ))}
        </div>
      )}

      {!loading && error && <div className="empty">{error}</div>}

      {!loading && !error && data && (
        <>
          <div className={`banner${top.length === 0 ? " warn" : ""}`}>
            {top.length === 0 ? <Info size={20} /> : <CheckCircle2 size={20} />}
            <strong>{acuan ? `Mirip dengan buku "${data.buku_acuan}"` : data.buku_acuan}</strong>
          </div>

          {top.length > 0 && (
            <>
              <div className="res-head">
                <h2>3 rekomendasi terbaik</h2>
                <span>Diurutkan dari yang paling cocok</span>
              </div>
              <Reveal className="grid" deps={[top]}>
  {top.map((b, i) => (
    <BookCard key={b.id_buku} buku={b} rank={i + 1} />
  ))}
</Reveal>
            </>
          )}

          {sisa.length > 0 && (
            <>
              <div className="res-head" style={{ marginTop: 36 }}>
                <h2>Buku lain yang berkaitan</h2>
                <span>{sisa.length} buku</span>
              </div>
              <Reveal className="grid" deps={[sisa]}>
  {sisa.map((b) => (
    <BookCard key={b.id_buku} buku={b} />
  ))}
</Reveal>
            </>
          )}

          {top.length > 0 && sisa.length === 0 && (
            <p className="hint">Tidak ada buku lain yang cukup berkaitan.</p>
          )}

          {top.length === 0 && (
            <div className="empty">
              <p>Coba kata kunci lain atau pilih &quot;Semua kategori&quot;.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function HasilPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="empty">Memuat…</div>}>
        <HasilIsi />
      </Suspense>
    </PageShell>
  );
}