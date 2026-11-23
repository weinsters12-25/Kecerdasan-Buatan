"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building,
  Calendar,
  Check,
  Copy,
  FileText,
  Hash,
  Network,
  Sparkles,
  User,
} from "lucide-react";
import PageShell from "../../components/PageShell";
import BookCover from "../../components/BookCover";
import BookCard from "../../components/BookCard";
import BookmarkButton from "../../components/BookmarkButton";
import StatusBaca from "../../components/StatusBaca";
import CatatanBuku from "../../components/CatatanBuku";
import Reveal from "../../components/Reveal";
import Magnetic from "../../components/Magnetic";
import { gsap, useGSAP, bolehAnimasi } from "../../lib/gsap";
import { getDetail, getKategori } from "../../lib/api";

export default function DetailBuku() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const pageRef = useRef(null);
  const [state, setState] = useState({ id: "", data: null, error: "" });
  const [tersalin, setTersalin] = useState(false);

  useEffect(() => {
    let batal = false;
    getKategori()
      .catch(() => {})
      .finally(() =>
        getDetail(id)
          .then((d) => !batal && setState({ id, data: d.error ? null : d, error: d.error || "" }))
          .catch(() => !batal && setState({ id, data: null, error: "Gagal terhubung ke server Python!" }))
      );
    return () => {
      batal = true;
    };
  }, [id]);

  const loading = state.id !== id;
  const b = state.data;
  const paragraf = (b?.sinopsis || "").split(/\n+/).filter(Boolean);

  const salinIsbn = async () => {
    try {
      await navigator.clipboard.writeText(b.isbn);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1800);
    } catch {}
  };

  useGSAP(
    () => {
      if (!b || !pageRef.current || !bolehAnimasi()) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".detail-cover .bc", {
        rotationY: -40,
        x: -60,
        autoAlpha: 0,
        transformPerspective: 900,
        transformOrigin: "left center",
        duration: 1.1,
        ease: "expo.out",
      })
        .from(".detail-info > *", { y: 28, autoAlpha: 0, stagger: 0.08, duration: 0.7 }, "-=0.7")
        .from(".meta-item", { scale: 0.9, autoAlpha: 0, stagger: 0.05, duration: 0.5 }, "-=0.6");

      gsap.to(".detail-cover .bc", {
        y: 50,
        ease: "none",
        scrollTrigger: { trigger: ".detail", start: "top top", end: "bottom top", scrub: true },
      });
    },
    { scope: pageRef, dependencies: [b?.id_buku] }
  );

  return (
    <PageShell>
      <section className="results">
        <button type="button" className="back" onClick={() => router.back()}>
          <ArrowLeft size={16} /> Kembali
        </button>

        {loading && <div className="skeleton" style={{ height: 320 }} />}
        {!loading && state.error && <div className="empty">{state.error}</div>}

        {!loading && b && (
          <div ref={pageRef}>
            <article className="detail">
              <div className="detail-cover">
                <BookCover buku={b} size="lg" />
              </div>

              <div className="detail-info">
                <Link
                  href={`/katalog?kategori=${encodeURIComponent(b.kategori)}`}
                  className="tag"
                  style={{ marginTop: 0, alignSelf: "flex-start" }}
                >
                  {b.kategori}
                </Link>
                <h1 className="detail-title">{b.judul}</h1>
                <p className="detail-author">oleh {b.penulis}</p>

                <div className="meta">
                  <div className="meta-item">
                    <User size={18} />
                    <div><small>Penulis</small><strong>{b.penulis}</strong></div>
                  </div>
                  <div className="meta-item">
                    <Building size={18} />
                    <div><small>Penerbit</small><strong>{b.penerbit}</strong></div>
                  </div>
                  <div className="meta-item">
                    <Calendar size={18} />
                    <div><small>Tahun terbit</small><strong>{b.tahun_terbit || "-"}</strong></div>
                  </div>
                  <div className="meta-item">
                    <FileText size={18} />
                    <div>
                      <small>Jumlah halaman</small>
                      <strong>{b.jumlah_halaman ? `${b.jumlah_halaman} hal.` : "-"}</strong>
                    </div>
                  </div>
                  {b.isbn && (
                    <div className="meta-item wide">
                      <Hash size={18} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <small>ISBN / ISSN</small>
                        <strong>{b.isbn}</strong>
                      </div>
                      <button type="button" className="copy-mini" onClick={salinIsbn} aria-label="Salin ISBN">
                        {tersalin ? <Check size={15} /> : <Copy size={15} />}
                        {tersalin ? "Tersalin" : "Salin"}
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="sub">Sinopsis</h2>
                  <div className="synopsis">
                    {paragraf.length ? (
                      paragraf.map((p, i) => <p key={i}>{p}</p>)
                    ) : (
                      <p>Sinopsis belum tersedia.</p>
                    )}
                  </div>
                </div>

                <div className="myb">
                  <h2 className="sub">Status baca &amp; catatan</h2>
                  <StatusBaca id={b.id_buku} />
                  <CatatanBuku key={b.id_buku} id={b.id_buku} />
                </div>

                <div className="actions">
                  <BookmarkButton id={b.id_buku} judul={b.judul} penuh />
                  <Magnetic>
                    <Link href={`/hasil?acuan=${b.id_buku}`} className="btn">
                      <Sparkles size={16} /> Lihat semua buku yang mirip
                    </Link>
                  </Magnetic>
                  <Link href={`/peta?fokus=${b.id_buku}`} className="btn ghost">
                    <Network size={16} /> Lihat di peta
                  </Link>
                </div>
              </div>
            </article>

            {b.serupa?.length > 0 && (
              <>
                <div className="res-head" style={{ marginTop: 40 }}>
                  <h2>Buku serupa</h2>
                  <span>Berdasarkan kemiripan isi</span>
                </div>
                <Reveal className="grid" deps={[b.id_buku]}>
                  {b.serupa.map((s) => (
                    <BookCard key={s.id_buku} buku={s} />
                  ))}
                </Reveal>
              </>
            )}
          </div>
        )}
      </section>
    </PageShell>
  );
}