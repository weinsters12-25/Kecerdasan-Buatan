"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Library,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
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

const MAKS_PILIHAN = 6;
const JEDA_SUKSES = 1400; // ms layar "berhasil masuk" ditampilkan

/* =====================================================================
   TAB: PILIHAN TERBAIK (hanya kurasi manual)
   ===================================================================== */
function TabTerbaik({ buku, setToast, tangani }) {
  const [cfg, setCfg] = useState(null);
  const [hilang, setHilang] = useState([]);
  const [q, setQ] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [berubah, setBerubah] = useState(false);

  const muat = useCallback(async () => {
    try {
      const d = await adm.getTerbaikAdmin();
      setCfg({
        ...d.cfg,
        mode: "manual", // selalu manual
        ids: d.cfg.ids.filter((i) => !d.ids_hilang.includes(i)),
      });
      setHilang(d.ids_hilang);
      // Jika konfigurasi lama masih "otomatis", tandai berubah agar bisa disimpan sebagai manual
      setBerubah(d.cfg.mode !== "manual");
    } catch (e) {
      tangani(e);
    }
  }, [tangani]);

  useEffect(() => {
    muat();
  }, [muat]);

  const byId = useMemo(() => new Map(buku.map((b) => [Number(b.id_buku), b])), [buku]);

  const ubah = (p) => {
    setCfg((c) => ({ ...c, ...p }));
    setBerubah(true);
  };

  const tambah = (id) => {
    if (cfg.ids.includes(id)) return;
    if (cfg.ids.length >= MAKS_PILIHAN) {
      setToast({ t: "err", s: `Maksimal ${MAKS_PILIHAN} buku.` });
      return;
    }
    ubah({ ids: [...cfg.ids, id] });
  };

  const hapusId = (id) => ubah({ ids: cfg.ids.filter((x) => x !== id) });

  const geser = (i, arah) => {
    const j = i + arah;
    if (j < 0 || j >= cfg.ids.length) return;
    const baru = [...cfg.ids];
    [baru[i], baru[j]] = [baru[j], baru[i]];
    ubah({ ids: baru });
  };

  const hasilCari = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return [];
    return buku
      .filter((b) => `${b.judul} ${b.penulis} ${b.kategori}`.toLowerCase().includes(k))
      .filter((b) => !cfg?.ids.includes(Number(b.id_buku)))
      .slice(0, 8);
  }, [q, buku, cfg]);

  const simpan = async () => {
    if (cfg.ids.length === 0) {
      setToast({ t: "err", s: "Pilih minimal satu buku." });
      return;
    }
    setSibuk(true);
    try {
      await adm.setTerbaikAdmin({
        mode: "manual",
        ids: cfg.ids,
        jumlah: cfg.jumlah,
        judul: cfg.judul,
        subjudul: cfg.subjudul,
      });
      await muat();
      setToast({ t: "ok", s: "Tersimpan. Beranda langsung memakai pilihan ini." });
    } catch (e) {
      tangani(e);
    } finally {
      setSibuk(false);
    }
  };

  if (!cfg) return <div className="skeleton" style={{ height: 240 }} />;

  return (
    <div className="tb">
      {hilang.length > 0 && (
        <p className="tb-warn" role="status">
          {hilang.length} buku pilihan sebelumnya sudah dihapus dari koleksi dan dilewati.
        </p>
      )}

      <div className="tb-head">
        <Star size={20} />
        <span>
          <strong>Kurasi Pustakawan</strong>
          <small>Pilih sendiri bukunya dan atur urutan tampilnya di beranda.</small>
        </span>
      </div>

      <div className="tb-grid">
        <div className="tb-col">
          <h3 className="tb-h">Teks bagian</h3>
          <div className="adm-fields">
            <label>
              Judul
              <input value={cfg.judul} onChange={(e) => ubah({ judul: e.target.value })} maxLength={80} />
            </label>
            <label>
              Subjudul
              <textarea
                className="tb-ta"
                rows={3}
                value={cfg.subjudul}
                onChange={(e) => ubah({ subjudul: e.target.value })}
                maxLength={200}
              />
            </label>
          </div>
        </div>

        <div className="tb-col">
          <h3 className="tb-h">
            Buku pilihan ({cfg.ids.length}/{MAKS_PILIHAN})
          </h3>

          {cfg.ids.length === 0 && <p className="tb-kosong">Belum ada buku. Cari dan tambahkan di bawah.</p>}

          <ol className="tb-list">
            {cfg.ids.map((id, i) => {
              const b = byId.get(id);
              return (
                <li key={id} className="tb-item">
                  <span className="tb-no">#{i + 1}</span>
                  {b && <BookCover buku={{ ...b, gambar: b.gambar_url }} size="xs" />}
                  <span className="tb-t">
                    <strong>{b ? b.judul : `Buku #${id}`}</strong>
                    <small>{b ? b.kategori || "Tanpa kategori" : "tidak ditemukan"}</small>
                  </span>
                  <span className="adm-act">
                    <button type="button" className="adm-ib" onClick={() => geser(i, -1)} disabled={i === 0} aria-label="Naikkan">
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="adm-ib"
                      onClick={() => geser(i, 1)}
                      disabled={i === cfg.ids.length - 1}
                      aria-label="Turunkan"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button type="button" className="adm-ib bahaya" onClick={() => hapusId(id)} aria-label="Hapus dari pilihan">
                      <X size={16} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>

          <label className="field" style={{ marginTop: 10 }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Cari buku untuk ditambahkan…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Cari buku untuk ditambahkan"
            />
          </label>

          {hasilCari.length > 0 && (
            <ul className="tb-cari">
              {hasilCari.map((b) => (
                <li key={b.id_buku}>
                  <button type="button" onClick={() => tambah(Number(b.id_buku))}>
                    <BookCover buku={{ ...b, gambar: b.gambar_url }} size="xs" />
                    <span className="tb-t">
                      <strong>{b.judul}</strong>
                      <small>
                        {b.kategori || "Tanpa kategori"} · {b.penulis || "-"}
                      </small>
                    </span>
                    <Plus size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.trim() && hasilCari.length === 0 && <p className="tb-kosong">Tidak ada buku yang cocok.</p>}
        </div>
      </div>

      <div className="adm-mf" style={{ marginTop: 18 }}>
        <button type="button" className="btn ghost" onClick={muat} disabled={sibuk || !berubah}>
          Batalkan perubahan
        </button>
        <button type="button" className="btn" onClick={simpan} disabled={sibuk || !berubah}>
          {sibuk ? (
            "Menyimpan…"
          ) : berubah ? (
            <>
              <Save size={16} /> Simpan pilihan
            </>
          ) : (
            <>
              <Check size={16} /> Tersimpan
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* =====================================================================
   HALAMAN ADMIN
   ===================================================================== */
export default function AdminPage() {
  const [fase, setFase] = useState("cek"); // cek | kunci | selamat | ok
  const [tab, setTab] = useState("buku"); // buku | terbaik
  const [kunci, setKunci] = useState("");
  const [lihatKunci, setLihatKunci] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState({ buku: [], kategori: [] });
  const [info, setInfo] = useState(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null); // { id, v, file, pratinjau }
  const [detail, setDetail] = useState(null); // { b, konfirmasi }
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

  // Layar "berhasil masuk" -> otomatis lanjut ke halaman admin
  useEffect(() => {
    if (fase !== "selamat") return;
    const t = setTimeout(() => {
      setFase("ok");
      setToast({ t: "ok", s: "Berhasil masuk. Selamat datang, admin!" });
    }, JEDA_SUKSES);
    return () => clearTimeout(t);
  }, [fase]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Tombol Esc menutup detail / form
  useEffect(() => {
    if (!detail && !form) return;
    const onKey = (e) => {
      if (e.key !== "Escape" || sibuk) return;
      if (form) setForm(null);
      else setDetail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail, form, sibuk]);

  const tangani = useCallback((e) => {
    if (e.status === 401) {
      adm.hapusKunci();
      setFase("kunci");
      setErr(e.message);
      return;
    }
    setToast({ t: "err", s: e.message || "Terjadi kesalahan." });
  }, []);

  const masuk = async (e) => {
    e.preventDefault();
    adm.simpanKunci(kunci.trim());
    setSibuk("masuk");
    setErr("");
    try {
      await adm.cek();
      await muat();
      setKunci("");
      setLihatKunci(false);
      setFase("selamat");
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
    setLihatKunci(false);
    setErr("");
    setTab("buku");
    setFase("kunci");
    setToast(null);
  };

  /* ----- detail buku ----- */
  const bukaDetail = (b, konfirmasi = false) => setDetail({ b, konfirmasi });

  /* ----- form buku ----- */
  const bukaBaru = () => setForm({ id: null, v: { ...KOSONG }, file: null, pratinjau: "" });
  const bukaUbah = (b) => {
    setDetail(null);
    setForm({
      id: b.id_buku,
      v: Object.fromEntries(Object.keys(KOSONG).map((k) => [k, b[k] || ""])),
      file: null,
      pratinjau: b.gambar_url || "",
    });
  };

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
    setSibuk("hapus");
    try {
      await adm.hapus(b.id_buku);
      await muat();
      setDetail(null);
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

  if (fase === "selamat") {
    return (
      <PageShell>
        <section className="results" style={{ paddingTop: 0 }}>
          <div className="adm-gate adm-sukses" role="status" aria-live="polite">
            <span className="adm-ok-ic">
              <Check size={34} strokeWidth={3} />
            </span>
            <h1>Berhasil masuk</h1>
            <p>Kunci admin benar. Membuka area admin…</p>
            <span className="adm-ok-bar" style={{ animationDuration: `${JEDA_SUKSES}ms` }} />
          </div>
        </section>
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
              <span className="gf-in gf-pass">
                <input
                  type={lihatKunci ? "text" : "password"}
                  value={kunci}
                  onChange={(e) => setKunci(e.target.value)}
                  autoComplete="off"
                  autoFocus
                  disabled={sibuk === "masuk"}
                />
                <button
                  type="button"
                  className="gf-eye"
                  onClick={() => setLihatKunci((v) => !v)}
                  aria-label={lihatKunci ? "Sembunyikan kunci" : "Tampilkan kunci"}
                  aria-pressed={lihatKunci}
                  tabIndex={-1}
                >
                  {lihatKunci ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
        <h1>Kelola situs</h1>
        <p className="lead">
          {tab === "buku"
            ? "Klik sebuah buku untuk melihat detailnya. Perubahan ditulis ke buku.csv (cadangan otomatis: buku_backup_admin.csv). Klik Terapkan agar pencarian dan peta memakai data baru."
            : "Atur buku yang tampil di bagian “Pilihan terbaik perpustakaan” pada beranda. Perubahan langsung berlaku."}
        </p>
      </section>

      <section className="results" style={{ paddingTop: 0 }}>
        <div className="adm-tabs" role="tablist" aria-label="Bagian admin">
          <button type="button" role="tab" aria-selected={tab === "buku"} className="adm-tab" onClick={() => setTab("buku")}>
            <Library size={16} /> Buku
          </button>
          <button type="button" role="tab" aria-selected={tab === "terbaik"} className="adm-tab" onClick={() => setTab("terbaik")}>
            <Trophy size={16} /> Pilihan terbaik
          </button>
          <button type="button" className="link-more adm-out" onClick={keluar}>
            Keluar admin
          </button>
        </div>

        {tab === "terbaik" && <TabTerbaik buku={data.buku} setToast={setToast} tangani={tangani} />}

        {tab === "buku" && (
          <>
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
                {info?.perlu_terapkan && sibuk !== "terapkan" && (
                  <i className="adm-dot" aria-label="Ada perubahan belum diterapkan" />
                )}
              </button>
            </div>

            <p className="adm-info">
              {data.buku.length} buku di file · {info?.total} aktif di situs · mode{" "}
              <b>{info?.mode === "hybrid" ? "Hybrid" : "TF-IDF"}</b>
            </p>

            <div className="adm-list">
              {tersaring.map((b) => (
                <div
                  className="adm-row adm-click"
                  key={b.id_buku}
                  role="button"
                  tabIndex={0}
                  onClick={() => bukaDetail(b)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      bukaDetail(b);
                    }
                  }}
                  aria-label={`Lihat detail ${b.judul}`}
                >
                  <BookCover buku={{ ...b, gambar: b.gambar_url }} size="xs" />
                  <div className="adm-main">
                    <strong>{b.judul}</strong>
                    <small>
                      #{b.id_buku} · {b.kategori || "Tanpa kategori"} · {b.penulis || "-"}
                      {b.tahun_terbit ? ` · ${b.tahun_terbit}` : ""}
                    </small>
                  </div>
                  <div className="adm-act" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <button type="button" className="adm-ib" onClick={() => bukaUbah(b)} aria-label={`Ubah ${b.judul}`}>
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="adm-ib bahaya" onClick={() => bukaDetail(b, true)} aria-label={`Hapus ${b.judul}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {tersaring.length === 0 && <div className="empty">Tidak ada buku yang cocok.</div>}
            </div>
          </>
        )}
      </section>

      {/* ===== MODAL DETAIL BUKU ===== */}
      {detail && (
        <div className="adm-ov" onMouseDown={() => !sibuk && setDetail(null)}>
          <div
            className="adm-modal adm-detail"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Detail ${detail.b.judul}`}
          >
            <div className="adm-mh">
              <h2>
                <BookOpen size={18} /> Detail buku
              </h2>
              <button type="button" className="adm-ib" onClick={() => setDetail(null)} aria-label="Tutup" disabled={!!sibuk}>
                <X size={18} />
              </button>
            </div>

            <div className="adm-dt">
              <div className="adm-dt-cv">
                <BookCover buku={{ ...detail.b, gambar: detail.b.gambar_url }} size="md" />
              </div>
              <div className="adm-dt-main">
                <span className="adm-dt-kat">{detail.b.kategori || "Tanpa kategori"}</span>
                <h3 className="adm-dt-judul">{detail.b.judul}</h3>
                <dl className="adm-dt-meta">
                  <div>
                    <dt>ID</dt>
                    <dd>#{detail.b.id_buku}</dd>
                  </div>
                  <div>
                    <dt>Penulis</dt>
                    <dd>{detail.b.penulis || "-"}</dd>
                  </div>
                  <div>
                    <dt>Penerbit</dt>
                    <dd>{detail.b.penerbit || "-"}</dd>
                  </div>
                  <div>
                    <dt>Tahun</dt>
                    <dd>{detail.b.tahun_terbit || "-"}</dd>
                  </div>
                  <div>
                    <dt>Halaman</dt>
                    <dd>{detail.b.jumlah_halaman || "-"}</dd>
                  </div>
                  <div>
                    <dt>ISBN / ISSN</dt>
                    <dd>{detail.b.isbn || "-"}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="adm-dt-sin">
              <h4>Sinopsis</h4>
              <p>{detail.b.sinopsis || "Belum ada sinopsis."}</p>
            </div>

            {detail.konfirmasi ? (
              <div className="adm-dt-warn" role="alertdialog" aria-live="assertive">
                <p>
                  Hapus <b>“{detail.b.judul}”</b>? Buku ini juga hilang dari daftar, status, dan catatan semua pengguna.
                  Tindakan ini tidak bisa dibatalkan.
                </p>
                <div className="adm-mf">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setDetail((d) => ({ ...d, konfirmasi: false }))}
                    disabled={sibuk === "hapus"}
                  >
                    Batal
                  </button>
                  <button type="button" className="btn adm-danger" onClick={() => hapus(detail.b)} disabled={sibuk === "hapus"}>
                    <Trash2 size={16} /> {sibuk === "hapus" ? "Menghapus…" : "Ya, hapus"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="adm-mf adm-dt-act">
                <button type="button" className="btn ghost adm-danger-ghost" onClick={() => setDetail((d) => ({ ...d, konfirmasi: true }))}>
                  <Trash2 size={16} /> Hapus buku
                </button>
                <button type="button" className="btn" onClick={() => bukaUbah(detail.b)}>
                  <Pencil size={16} /> Ubah data
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL FORM TAMBAH / UBAH ===== */}
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