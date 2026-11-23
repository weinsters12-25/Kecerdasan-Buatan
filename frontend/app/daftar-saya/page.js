"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  Heart,
  LogIn,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import PageShell from "../components/PageShell";
import BookCover from "../components/BookCover";
import BookCard from "../components/BookCard";
import Reveal from "../components/Reveal";
import { INFO_STATUS } from "../components/StatusBaca";
import { useAkun, useDaftarSaya } from "../lib/useDaftarSaya";
import { STATUS_BACA, useKoleksi } from "../lib/useKoleksi";
import { getBuku, getKategori, getRekomDaftar } from "../lib/api";

const FILTER = [
  ["semua", "Semua"],
  ["ingin", "Ingin dibaca"],
  ["sedang", "Sedang dibaca"],
  ["selesai", "Selesai"],
];

export default function DaftarSaya() {
  const { ids, toggle, kosongkan } = useDaftarSaya();
  const { user, siap } = useAkun();
  const { status, catatan, setStatus } = useKoleksi();
  const [semua, setSemua] = useState(null);
  const [error, setError] = useState("");
  const [tersalin, setTersalin] = useState(false);
  const [filter, setFilter] = useState("semua");
  const [rekom, setRekom] = useState({ kunci: "", data: null, gagal: false });

  useEffect(() => {
    getKategori()
      .catch(() => {})
      .finally(() =>
        getBuku()
          .then(setSemua)
          .catch(() => setError("Gagal terhubung ke server Python!"))
      );
  }, []);

  const tersimpan = useMemo(
    () => (semua ? ids.map((id) => semua.find((b) => b.id_buku === id)).filter(Boolean) : []),
    [semua, ids]
  );

  const stDari = (id) => status[String(id)] || "";

  const hitung = useMemo(() => {
    const h = { semua: tersimpan.length, ingin: 0, sedang: 0, selesai: 0 };
    tersimpan.forEach((b) => {
      const s = status[String(b.id_buku)];
      if (s && h[s] !== undefined) h[s] += 1;
    });
    return h;
  }, [tersimpan, status]);

  const tampil = useMemo(
    () => tersimpan.filter((b) => filter === "semua" || stDari(b.id_buku) === filter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tersimpan, filter, status]
  );

  const persen = tersimpan.length ? Math.round((hitung.selesai / tersimpan.length) * 100) : 0;

  /* ----- rekomendasi dari seluruh daftar ----- */
  const kunciIds = ids.join(",");
  useEffect(() => {
    if (!ids.length) return;
    let batal = false;
    const t = setTimeout(() => {
      getRekomDaftar(ids, 6)
        .then((d) => !batal && setRekom({ kunci: kunciIds, data: Array.isArray(d) ? d : [], gagal: false }))
        .catch(() => !batal && setRekom({ kunci: kunciIds, data: null, gagal: true }));
    }, 400);
    return () => {
      batal = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunciIds]);

  const rekomSiap = ids.length > 0 && rekom.kunci === kunciIds;

  const putarStatus = (id) => {
    const i = STATUS_BACA.indexOf(stDari(id));
    setStatus(id, i === STATUS_BACA.length - 1 ? "" : STATUS_BACA[i + 1]);
  };

  /* ----- ekspor ----- */
  const teks = () =>
    [
      `Daftar bacaan ${user ? user.nama || user.npm : "saya"}`,
      "",
      ...tersimpan.map((b, i) => {
        const s = stDari(b.id_buku);
        const c = catatan[String(b.id_buku)];
        return (
          `${i + 1}. ${b.judul} — ${b.penulis}${b.tahun_terbit ? ` (${b.tahun_terbit})` : ""}` +
          (s ? ` [${INFO_STATUS[s].label}]` : "") +
          (c ? `\n   Catatan: ${c.replace(/\n+/g, " ")}` : "")
        );
      }),
    ].join("\n");

  const unduh = () => {
    const blob = new Blob([teks()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "daftar-bacaan.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(teks());
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1800);
    } catch {}
  };

  return (
    <PageShell>
      <section className="page-head">
        <h1>Daftar saya</h1>
        <p className="lead">
          {user
            ? `Rak pribadi ${user.nama || "kamu"}, tersimpan di akun dan bisa dibuka dari perangkat mana pun.`
            : "Rak pribadi berisi buku yang Anda simpan. Saat ini tersimpan di browser ini saja."}
        </p>
      </section>

      <section className="results" style={{ paddingTop: 0 }}>
        {siap && (
          <div className={`akun-banner${user ? " ok" : ""}`}>
            <span className="ab-ic">{user ? <ShieldCheck size={20} /> : <LogIn size={20} />}</span>
            <div>
              {user ? (
                <>
                  <strong>Tersimpan di akun NPM {"••••" + user.npm.slice(-4)}</strong>
                  <small>Daftar, status baca, dan catatan otomatis disinkronkan.</small>
                </>
              ) : (
                <>
                  <strong>Masuk dengan NPM agar daftar tidak hilang</strong>
                  <small>Daftar, status, dan catatan yang sudah kamu buat akan ikut dipindahkan ke akun.</small>
                </>
              )}
            </div>
            {!user && (
              <Link href="/masuk?next=/daftar-saya" className="btn">
                Masuk
              </Link>
            )}
          </div>
        )}

        {error && <div className="empty">{error}</div>}

        {!error && siap && semua && ids.length === 0 && (
          <div className="empty">
            <div className="ds-kosong" aria-hidden="true">
              <i />
              <i />
              <i className="slot" />
            </div>
            <p>Rak Anda masih kosong. Ketuk ikon hati pada buku untuk menyimpannya di sini.</p>
            <Link href="/katalog" className="btn" style={{ marginTop: 14 }}>
              Jelajahi katalog
            </Link>
          </div>
        )}

        {!error && tersimpan.length > 0 && (
          <>
            <div className="prog" aria-label="Progres membaca">
              <div className="prog-t">
                <strong>
                  {hitung.selesai} dari {tersimpan.length} buku selesai dibaca
                </strong>
                <span>{persen}%</span>
              </div>
              <div className="prog-bar" role="progressbar" aria-valuenow={persen} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${persen}%` }} />
              </div>
            </div>

            <div className="res-head">
              <h2>
                <Heart size={20} style={{ verticalAlign: "-3px" }} /> {tersimpan.length} buku tersimpan
              </h2>
              <div className="ds-tools">
                <button type="button" className="copy-mini" onClick={salin}>
                  {tersalin ? <Check size={15} /> : <Copy size={15} />} {tersalin ? "Tersalin" : "Salin"}
                </button>
                <button type="button" className="copy-mini" onClick={unduh}>
                  <Download size={15} /> Unduh .txt
                </button>
                <button type="button" className="link-more" onClick={kosongkan}>
                  <Trash2 size={14} style={{ verticalAlign: "-2px" }} /> Kosongkan
                </button>
              </div>
            </div>

            <div className="filters" role="group" aria-label="Filter status baca">
              {FILTER.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className="fchip"
                  aria-pressed={filter === k}
                  onClick={() => setFilter(k)}
                >
                  {label} <span className="fc">{hitung[k]}</span>
                </button>
              ))}
            </div>

            {tampil.length === 0 ? (
              <div className="empty">Belum ada buku dengan status ini.</div>
            ) : (
              <div className="ds-wall">
                <Reveal className="ds-shelf" deps={[filter, tampil.length]}>
                  {tampil.map((b) => {
                    const s = stDari(b.id_buku);
                    const info = s ? INFO_STATUS[s] : null;
                    return (
                      <div className="ds-book" key={b.id_buku}>
                        <Link href={`/buku/${b.id_buku}`} className="ds-cover" aria-label={b.judul}>
                          <BookCover buku={b} size="md" />
                        </Link>
                        <button
                          type="button"
                          className="ds-x"
                          aria-label={`Hapus ${b.judul}`}
                          onClick={() => toggle(b.id_buku)}
                        >
                          <X size={13} />
                        </button>
                        <div className="ds-board" />
                        <p>{b.judul}</p>
                        <div className="ds-meta">
                          <button
                            type="button"
                            className={`st-badge${s ? "" : " kosong"}`}
                            data-st={s || undefined}
                            onClick={() => putarStatus(b.id_buku)}
                            title="Klik untuk mengganti status"
                          >
                            {info ? (
                              <>
                                <info.Ikon size={12} /> {info.label}
                              </>
                            ) : (
                              "Beri status"
                            )}
                          </button>
                          {catatan[String(b.id_buku)] && (
                            <Link
                              href={`/buku/${b.id_buku}`}
                              className="ds-note"
                              title={catatan[String(b.id_buku)]}
                              aria-label="Ada catatan"
                            >
                              <StickyNote size={14} />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </Reveal>
              </div>
            )}

            {/* ===== Rekomendasi dari daftar ===== */}
            <div className="res-head" style={{ marginTop: 44 }}>
              <div>
                <h2>
                  <Sparkles size={20} style={{ verticalAlign: "-3px", color: "var(--accent)" }} /> Rekomendasi
                  untuk kamu
                </h2>
                <p className="res-sub">Dihitung dari seluruh buku di daftarmu, bukan satu buku saja.</p>
              </div>
            </div>

            {!rekomSiap && (
              <div className="grid">
                {[0, 1].map((n) => (
                  <div key={n} className="skeleton" />
                ))}
              </div>
            )}
            {rekomSiap && rekom.gagal && <div className="empty">Rekomendasi belum bisa dimuat. Coba muat ulang halaman.</div>}
            {rekomSiap && !rekom.gagal && rekom.data?.length === 0 && (
              <div className="empty">Belum ada buku lain yang cukup mirip. Simpan lebih banyak buku untuk hasil yang lebih baik.</div>
            )}
            {rekomSiap && rekom.data?.length > 0 && (
              <Reveal className="grid" deps={[kunciIds]}>
                {rekom.data.map((b) => (
                  <BookCard key={b.id_buku} buku={b} />
                ))}
              </Reveal>
            )}
          </>
        )}
      </section>
    </PageShell>
  );
}