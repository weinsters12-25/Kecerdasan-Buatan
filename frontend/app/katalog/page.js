"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import PageShell from "../components/PageShell";
import BookCard from "../components/BookCard";
import RakKategori from "../components/RakKategori";
import Reveal from "../components/Reveal";
import { getBuku, getKategori } from "../lib/api";

function KatalogIsi() {
  const sp = useSearchParams();
  const router = useRouter();
  const kategori = sp.get("kategori") || "";

  const [daftarKat, setDaftarKat] = useState([]);
  const [buku, setBuku] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dipanggil saat buku di rak diklik: filter katalog, lalu geser ke daftar buku
  const bukaKategori = (nama) => {
    router.push(`/katalog?kategori=${encodeURIComponent(nama)}`, { scroll: false });
    setTimeout(
      () => document.getElementById("katalog-hasil")?.scrollIntoView({ behavior: "smooth" }),
      150
    );
  };

  useEffect(() => {
    getKategori()
      .then(setDaftarKat)
      .catch(() => setError("Gagal terhubung ke server Python!"));
  }, []);

  // Muat buku saat kategori / kata kunci berubah (dengan jeda 250 ms)
  useEffect(() => {
    let batal = false;
    const t = setTimeout(() => {
      setLoading(true);
      getBuku(kategori, q.trim())
        .then((d) => {
          if (batal) return;
          setBuku(d);
          setError("");
        })
        .catch(() => !batal && setError("Gagal terhubung ke server Python!"))
        .finally(() => !batal && setLoading(false));
    }, 250);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [kategori, q]);

  return (
    <>
      <section className="page-head">
        <h1>Katalog buku</h1>
        <p className="lead">Ambil satu buku dari rak untuk melihat isi kategorinya, atau cari judul dan penulis.</p>
      </section>

      <section aria-label="Rak kategori" style={{ marginBottom: 28 }}>
        <RakKategori kategori={daftarKat} aktif={kategori} onBuka={bukaKategori} />
      </section>

      <section className="results" id="katalog-hasil" style={{ scrollMarginTop: 80 }}>
        <div className="toolbar">
          <label className="field">
            <Search size={16} />
            <input
              type="text"
              placeholder="Cari judul, penulis, atau kategori…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Cari di katalog"
            />
          </label>
          {kategori && (
            <Link href="/katalog" scroll={false} className="chip">
              {kategori} <X size={13} />
            </Link>
          )}
        </div>

        <div className="res-head">
          <h2>{kategori ? `Kategori ${kategori}` : "Semua buku"}</h2>
          {!loading && <span>{buku.length} buku</span>}
        </div>

        {error && <div className="empty">{error}</div>}

        {loading && !error && (
          <div className="grid">
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="skeleton" />
            ))}
          </div>
        )}

        {!loading && !error && buku.length === 0 && (
          <div className="empty">Tidak ada buku yang cocok.</div>
        )}

        {!loading && !error && buku.length > 0 && (
          <Reveal className="grid" deps={[buku]}>
            {buku.map((b) => (
              <BookCard key={b.id_buku} buku={b} />
            ))}
          </Reveal>
        )}
      </section>
    </>
  );
}

export default function KatalogPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="empty">Memuat…</div>}>
        <KatalogIsi />
      </Suspense>
    </PageShell>
  );
}