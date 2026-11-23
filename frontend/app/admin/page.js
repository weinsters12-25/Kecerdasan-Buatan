"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, KeyRound, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, X } from "lucide-react";
import PageShell from "../components/PageShell";
import BookCover from "../components/BookCover";
import * as adm from "../lib/admin";
import { daftarkanKategori } from "../lib/api";

const KOSONG = {
  judul: "",
  kategori: "",
  penulis: "",
  tahun_terbit: "",
  jumlah_halaman: "",
  penerbit: "",
  isbn: "",
  gambar: "",
  sinopsis: "",
};

export default function AdminPage() {
  const [fase, setFase] = useState("cek"); // cek | kunci | ok
  const [kunci, setKunci] = useState("");
  const [err, setErr] = useState("");
  const [data, setData] = useState({ buku: [], kategori: [] });
  const [info, setInfo] = useState(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // { id, v, file, pratinjau }
  const [sibuk, setSibuk] = useState("");
  const [toast, setToast] = useState(null);

  const muat = useCallback(async () => {
    const [d, s] = await Promise.all([adm.daftar(), adm.status()]);
    daftarkanKategori(d.kategori.map((k) => k.toLowerCase()));
    setData(d);
    setInfo(s);
  }, []);

  useEffect(() => {
    if (!adm.ambilKunci()) {
      setFase("kunci");
      return;
    }
    adm
      .cek()
      .then(muat)
      .then(() => setFase("ok"))
      .catch((e) => {
        if (e.status === 401) adm.hapusKunci();
        setErr(e.message);
        setFase("kunci");
      });
  }, [muat]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const tangani = (e) => {
    if (e.status === 401) {
      adm.hapusKunci();
      setFase("kunci");
      setErr(e.message);
      return;
    }
    setToast({ t: "err", s: e.message || "Terjadi kesalahan." });
  };

  const masuk = async (e) => {
    e.preventDefault();
    adm.simpanKunci(kunci.trim());
    setSibuk("masuk");
    try {
      await adm.cek();
      await muat();
      setErr("");
      setFase("ok");
    } catch (er) {
      adm.hapusKunci();
      setErr(er.message);
    } finally {
      setSibuk("");
    }
  };

  const keluar = () => {
    adm.hapusKunci();
    setKunci("");
    setFase("kunci");
  };

  /* ----- form ----- */
  const bukaBaru = () => setForm({ id: null, v: { ...KOSONG }, file: null, pratinjau: "" });
  const bukaUbah = (b) =>
    setForm({
      id: b.id_buku,
      v: Object.fromEntries(Object.keys(KOSONG).map((k) => [k, b[k] || ""])),
      file: null,
      pratinjau: b.gambar_url || "",
    });

  const isi = (k, val) => setForm((f) => ({ ...f, v: { ...f.v, [k]: val } }));

  const pilihFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/\.(jpe?g|png|webp)$/i.test(f.name)) {
      setToast({ t: "err", s: "Format harus JPG, PNG, atau WEBP." });
      return;
    }
    if (f.size > 2_000_000) {
      setToast({ t: "err", s: "Ukuran gambar maksimal 2 MB." });
      return;
    }
    setForm((x) => ({ ...x, file: f, pratinjau: URL.createObjectURL(f) }));
  };

  const simpan = async (e) => {
    e.preventDefault();
    if (!form.v.judul.trim()) {
      setToast({ t: "err", s: "Judul wajib diisi." });
      return;
    }
    setSibuk("simpan");
    try {
      let id = form.id;
      if (id) await adm.ubah(id, form.v);
      else id = (await adm.tambah(form.v)).id_buku;
      if (form.file) await adm.cover(id, form.file);
      await muat();
      setForm(null);
      setToast({ t: "ok", s: "Tersimpan. Klik “Terapkan perubahan” agar tampil di situs." });
    } catch (er) {
      tangani(er);
    } finally {
      setSibuk("");
    }
  };

  const hapus = async (b) => {
    if (!window.confirm(`Hapus “${b.judul}”? Buku ini juga hilang dari daftar, status, dan catatan semua pengguna.`)) return;
    setSibuk("hapus");
    try {
      await adm.hapus(b.id_buku);
      await muat();
      setToast({ t: "ok", s: "Buku dihapus. Klik “Terapkan perubahan”." });
    } catch (er) {
      tangani(er);
    } finally {
      setSibuk("");
    }
  };

  const terapkan = async () => {
    setSibuk("terapkan");
    try {
      const r = await adm.terapkan();
      await muat();
      setToast({
        t: r.mode === "hybrid" ? "ok" : "warn",
        s:
          r.mode === "hybrid"
            ? `Diterapkan. ${r.total} buku aktif (mode Hybrid).`
            : `Diterapkan, tetapi embedding belum lengkap (kuota?). ${r.total} buku aktif di mode TF-IDF.`,
      });
    } catch (er) {
      tangani(er);
    } finally {
      setSibuk("");
    }
  };

  const tersaring = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return data.buku;
    return data.buku.filter((b) => `${b.judul} ${b.penulis} ${b.kategori}`.toLowerCase().includes(k));
  }, [data, q]);

  /* ----- tampilan ----- */
  if (fase === "cek") {
    return (
      <PageShell>
        <div className="skeleton" style={{ height: 220 }} />
      </PageShell>
    );
  }

  if (fase === "kunci") {
    return (
      <PageShell>
        <section className="results" style={{ paddingTop: 0 }}>
          <form className="adm-gate" onSubmit={masuk}>
            <span className="ab-ic">
              <ShieldCheck size={22} />
            </span>
            <h1>Area admin</h1>
            <p>Masukkan kunci admin dari file .env di server.</p>
            <label className="gf">
              <span className="gf-l">
                <KeyRound size={14} /> Kunci admin
              </span>
              <span className="gf-in">
                <input
                  type="password"
                  value={kunci}
                  onChange={(e) => setKunci(e.target.value)}
                  autoComplete="off"
                  autoFocus
                />
              </span>
            </label>
            {err && (
              <p className="gc-err" role="alert">
                {err}
              </p>
            )}
            <button type="submit" className="btn gc-go" disabled={!kunci.trim() || sibuk === "masuk"}>
              {sibuk === "masuk" ? "Memeriksa…" : "Buka admin"}
            </button>
          </form>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="page-head">
        <h1>Kelola buku</h1>
        <p className="lead">
          Perubahan ditulis ke buku.csv (cadangan otomatis: buku_backup_admin.csv). Klik Terapkan agar
          pencarian dan peta memakai data baru.
        </p>
      </section>

      <section className="results" style={{ paddingTop: 0 }}>
        <div className="adm-bar">
          <label className="field">
            <Search size={16} />
            <input
              type="text"
              placeholder="Cari judul, penulis, kategori…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Cari buku"
            />
          </label>
          <button type="button" className="btn" onClick={bukaBaru}>
            <Plus size={16} /> Tambah buku
          </button>
          <button
            type="button"
            className={`btn ghost adm-apply${info?.perlu_terapkan ? " perlu" : ""}`}
            onClick={terapkan}
            disabled={sibuk === "terapkan"}
          >
            <RefreshCw size={16} className={sibuk === "terapkan" ? "putar" : ""} />
            {sibuk === "terapkan" ? "Menghitung…" : "Terapkan perubahan"}
            {info?.perlu_terapkan && sibuk !== "terapkan" && <i className="adm-dot" aria-label="Ada perubahan belum diterapkan" />}
          </button>
          <button type="button" className="link-more" onClick={keluar}>
            Keluar admin
          </button>
        </div>

        <p className="adm-info">
          {data.buku.length} buku di file · {info?.total} aktif di situs · mode{" "}
          <b>{info?.mode === "hybrid" ? "Hybrid" : "TF-IDF"}</b>
        </p>

        <div className="adm-list">
          {tersaring.map((b) => (
            <div className="adm-row" key={b.id_buku}>
              <BookCover buku={{ ...b, gambar: b.gambar_url }} size="xs" />
              <div className="adm-main">
                <strong>{b.judul}</strong>
                <small>
                  #{b.id_buku} · {b.kategori || "Tanpa kategori"} · {b.penulis || "-"}
                  {b.tahun_terbit ? ` · ${b.tahun_terbit}` : ""}
                </small>
              </div>
              <div className="adm-act">
                <button type="button" className="adm-ib" onClick={() => bukaUbah(b)} aria-label={`Ubah ${b.judul}`}>
                  <Pencil size={16} />
                </button>
                <button type="button" className="adm-ib bahaya" onClick={() => hapus(b)} aria-label={`Hapus ${b.judul}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {tersaring.length === 0 && <div className="empty">Tidak ada buku yang cocok.</div>}
        </div>
      </section>

      {form && (
        <div className="adm-ov" onMouseDown={() => !sibuk && setForm(null)}>
          <form
            className="adm-modal"
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={simpan}
            role="dialog"
            aria-modal="true"
            aria-label={form.id ? "Ubah buku" : "Tambah buku"}
          >
            <div className="adm-mh">
              <h2>{form.id ? `Ubah buku #${form.id}` : "Tambah buku"}</h2>
              <button type="button" className="adm-ib" onClick={() => setForm(null)} aria-label="Tutup">
                <X size={18} />
              </button>
            </div>

            <div className="adm-fg">
              <div className="adm-cv">
                <BookCover
                  buku={{ judul: form.v.judul || "?", kategori: form.v.kategori, gambar: form.pratinjau }}
                  size="md"
                />
                <label className="copy-mini" style={{ cursor: "pointer" }}>
                  <ImagePlus size={15} /> {form.file ? "Ganti gambar" : "Pilih sampul"}
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={pilihFile} hidden />
                </label>
                <small>JPG/PNG/WEBP, maks. 2 MB</small>
              </div>

              <div className="adm-fields">
                <label>
                  Judul *
                  <input value={form.v.judul} onChange={(e) => isi("judul", e.target.value)} maxLength={250} required />
                </label>
                <label>
                  Kategori
                  <input
                    value={form.v.kategori}
                    onChange={(e) => isi("kategori", e.target.value)}
                    list="adm-kat"
                    maxLength={60}
                  />
                  <datalist id="adm-kat">
                    {data.kategori.map((k) => (
                      <option key={k} value={k} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Penulis
                  <input value={form.v.penulis} onChange={(e) => isi("penulis", e.target.value)} maxLength={200} />
                </label>
                <label>
                  Penerbit
                  <input value={form.v.penerbit} onChange={(e) => isi("penerbit", e.target.value)} maxLength={150} />
                </label>
                <div className="adm-3">
                  <label>
                    Tahun
                    <input
                      inputMode="numeric"
                      value={form.v.tahun_terbit}
                      onChange={(e) => isi("tahun_terbit", e.target.value.replace(/\D/g, "").slice(0, 4))}
                    />
                  </label>
                  <label>
                    Halaman
                    <input
                      inputMode="numeric"
                      value={form.v.jumlah_halaman}
                      onChange={(e) => isi("jumlah_halaman", e.target.value.replace(/\D/g, "").slice(0, 5))}
                    />
                  </label>
                  <label>
                    ISBN / ISSN
                    <input value={form.v.isbn} onChange={(e) => isi("isbn", e.target.value)} maxLength={40} />
                  </label>
                </div>
                <label>
                  Gambar (nama file atau URL, opsional)
                  <input value={form.v.gambar} onChange={(e) => isi("gambar", e.target.value)} maxLength={300} />
                </label>
              </div>
            </div>

            <label className="adm-sin">
              Sinopsis
              <textarea rows={6} value={form.v.sinopsis} onChange={(e) => isi("sinopsis", e.target.value)} maxLength={6000} />
            </label>

            <div className="adm-mf">
              <button type="button" className="btn ghost" onClick={() => setForm(null)} disabled={!!sibuk}>
                Batal
              </button>
              <button type="submit" className="btn" disabled={!!sibuk}>
                {sibuk === "simpan" ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className={`adm-toast ${toast.t}`} role="status">
          {toast.s}
        </div>
      )}
    </PageShell>
  );
}