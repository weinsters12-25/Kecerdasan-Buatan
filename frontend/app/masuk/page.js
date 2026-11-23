"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Hash, KeyRound, LogOut, Sparkles, UserRound } from "lucide-react";
import PageShell from "../components/PageShell";
import Splat from "../components/Splat";
import { gsap, useGSAP, bolehAnimasi, bisaHover } from "../lib/gsap";
import { API } from "../lib/api";
import { useAkun } from "../lib/useDaftarSaya";

const WARNA = ["var(--lime)", "var(--coral)", "var(--sky)", "var(--cobalt)"];

const DRIPS = [
  { x: "6%", w: 9, l: 30 },
  { x: "15%", w: 7, l: 18 },
  { x: "27%", w: 11, l: 44 },
  { x: "41%", w: 8, l: 22 },
  { x: "55%", w: 10, l: 38 },
  { x: "68%", w: 7, l: 16 },
  { x: "79%", w: 11, l: 46 },
  { x: "91%", w: 8, l: 26 },
];

// Cipratan hasil klik: muncul dengan pantulan elastis
function Pop({ s }) {
  const ref = useRef(null);
  useGSAP(() => {
    const el = ref.current;
    if (!el) return;
    gsap.set(el, { xPercent: -50, yPercent: -50, rotation: s.rot });
    if (!bolehAnimasi()) return;
    gsap.fromTo(
      el,
      { scale: 0, rotation: s.rot - 40 },
      { scale: 1, rotation: s.rot, duration: 0.9, ease: "elastic.out(1, 0.45)" }
    );
  });
  return (
    <div ref={ref} className="gw-pop" style={{ left: s.x, top: s.y, width: s.size, height: s.size, color: s.warna }}>
      <Splat seed={s.seed} />
    </div>
  );
}

// Ikon abstrak kecil: tautan ke login admin
function AdminGlyph() {
  return (
    <Link href="/admin" className="adm-glyph" aria-label="Masuk sebagai admin" data-tip="Admin">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
        <g className="ag-hex">
          <path d="M12 2.5 20.5 7.5v9L12 21.5 3.5 16.5v-9z" />
          <path d="M12 7.6 16.2 10v4L12 16.4 7.8 14v-4z" fill="currentColor" fillOpacity="0.3" />
        </g>
        <circle className="ag-dot" cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" />
      </svg>
    </Link>
  );
}

function MasukIsi() {
  const router = useRouter();
  const sp = useSearchParams();
  const tujuanMentah = sp.get("next") || "/daftar-saya";
  const tujuan = tujuanMentah.startsWith("/") && !tujuanMentah.startsWith("//") ? tujuanMentah : "/daftar-saya";

  const { user, siap, masuk, keluar } = useAkun();
  const wallRef = useRef(null);
  const wipeRef = useRef(null);
  const idSplat = useRef(0);

  const [npm, setNpm] = useState("");
  const [nama, setNama] = useState("");
  const [pw, setPw] = useState("");
  const [lihat, setLihat] = useState(false);
  const [err, setErr] = useState("");
  const [fieldErr, setFieldErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [samaNpm, setSamaNpm] = useState(true);
  const [pesan, setPesan] = useState("");
  const [splats, setSplats] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/auth/info`)
      .then((r) => r.json())
      .then((d) => setSamaNpm(!!d.password_sama_npm))
      .catch(() => {});
  }, []);

  /* ===== Animasi masuk ===== */
  useGSAP(
    () => {
      if (!siap || !bolehAnimasi()) return;
      gsap.from(".gw-bg", { scale: 0, autoAlpha: 0, duration: 1.2, ease: "elastic.out(1, 0.5)", stagger: 0.12 });

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".gc", { y: 80, autoAlpha: 0, rotation: 3, duration: 0.8, ease: "back.out(1.4)" })
        .from(".gc-paint", { scaleX: 0, transformOrigin: "left center", duration: 0.5 }, "-=0.4")
        .from(".gc-paint i", { scaleY: 0, transformOrigin: "top", duration: 0.7, ease: "elastic.out(1, 0.5)", stagger: 0.06 }, "-=0.2")
        .from(
          ".gc-title span",
          { yPercent: 120, rotation: () => gsap.utils.random(-25, 25), autoAlpha: 0, duration: 0.7, ease: "back.out(2)", stagger: 0.07 },
          "-=0.6"
        )
        .from(".gc .tape, .gc-body > *", { y: 20, autoAlpha: 0, stagger: 0.06, duration: 0.5 }, "-=0.3");

      gsap.to(".gc-paint i", {
        scaleY: 1.15,
        transformOrigin: "top",
        duration: () => gsap.utils.random(1.6, 2.8),
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: 2,
        stagger: { each: 0.25, from: "random" },
      });
    },
    { scope: wallRef, dependencies: [siap, !!user] }
  );

  /* ===== Paralaks cat latar mengikuti kursor ===== */
  useGSAP(
    () => {
      const wall = wallRef.current;
      if (!wall || !bisaHover() || !bolehAnimasi()) return;
      const movers = gsap.utils.toArray(".gw-bg", wall).map((el, i) => ({
        x: gsap.quickTo(el, "x", { duration: 1, ease: "power3" }),
        y: gsap.quickTo(el, "y", { duration: 1, ease: "power3" }),
        d: (i + 1) * 10,
      }));
      const gerak = (e) => {
        const r = wall.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        movers.forEach((m) => {
          m.x(-px * m.d * 2);
          m.y(-py * m.d * 2);
        });
      };
      wall.addEventListener("pointermove", gerak);
      return () => wall.removeEventListener("pointermove", gerak);
    },
    { scope: wallRef }
  );

  /* ===== Klik dinding = semprot cat ===== */
  const semprot = (e) => {
    if (e.target.closest(".gc") || e.target.closest(".gw-hint")) return;
    const r = wallRef.current.getBoundingClientRect();
    const item = {
      id: ++idSplat.current,
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      seed: Math.floor(Math.random() * 1e6),
      size: 90 + Math.random() * 130,
      rot: Math.random() * 360,
      warna: WARNA[Math.floor(Math.random() * WARNA.length)],
    };
    setSplats((s) => [...s.slice(-17), item]);
  };

  /* ===== Layar tersiram cat, lalu pindah halaman ===== */
  const siramLaluPindah = (teks) => {
    setPesan(teks);
    if (!bolehAnimasi()) {
      router.push(tujuan);
      return;
    }
    requestAnimationFrame(() => {
      const w = wipeRef.current;
      if (!w) {
        router.push(tujuan);
        return;
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const kotak = 0.4 * Math.min(vw, vh);
      const s = (Math.max(vw, vh) * 2.2) / kotak;
      gsap.set(w, { visibility: "visible" });
      gsap
        .timeline({ onComplete: () => router.push(tujuan) })
        .fromTo(w.querySelector(".w-splat"), { scale: 0, rotation: -30 }, { scale: s, rotation: 10, duration: 0.8, ease: "expo.out" }, 0)
        .fromTo(w.querySelector(".w-fill"), { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0.35)
        .fromTo(w.querySelector(".w-msg"), { y: 40, opacity: 0, rotation: -4 }, { y: 0, opacity: 1, rotation: -2, duration: 0.6, ease: "back.out(2)" }, 0.6)
        .to({}, { duration: 0.6 });
    });
  };

  const gagal = (msg, field = "") => {
    setErr(msg);
    setFieldErr(field);
    if (bolehAnimasi()) {
      gsap.fromTo(".gc", { x: -12 }, { x: 0, duration: 0.6, ease: "elastic.out(1, 0.3)" });
    }
  };

  const kirim = async (e) => {
    e.preventDefault();
    if (loading) return;
    const n = npm.trim();
    if (!/^\d{6,15}$/.test(n)) return gagal("NPM harus berupa angka 6 sampai 15 digit.", "npm");
    if (!pw) return gagal("Password belum diisi.", "pw");
    if (samaNpm && pw !== n) return gagal("Password mahasiswa sama dengan NPM-mu.", "pw");

    setLoading(true);
    setErr("");
    setFieldErr("");
    try {
      const r = await masuk(n, pw, nama.trim());
      const panggilan = r.nama || r.npm;
      siramLaluPindah(r.baru ? `Akun dibuat! Halo, ${panggilan}` : `Selamat datang, ${panggilan}`);
    } catch (er) {
      gagal(er.message || "Gagal masuk.", "pw");
      setLoading(false);
    }
  };

  const judul = user ? "SIAP!" : "MASUK";
  const tape = user ? "Akunmu aktif" : "Pakai NPM-mu";

  return (
    <section className="results" style={{ paddingTop: 0 }}>
      <div className="gw" ref={wallRef} onPointerDown={semprot}>
        {/* cat latar */}
        <div className="gw-bg b1" aria-hidden="true"><Splat seed={11} /></div>
        <div className="gw-bg b2" aria-hidden="true"><Splat seed={23} /></div>
        <div className="gw-bg b3" aria-hidden="true"><Splat seed={37} /></div>
        <div className="gw-bg b4" aria-hidden="true"><Splat seed={53} /></div>

        {splats.map((s) => (
          <Pop key={s.id} s={s} />
        ))}

        {siap && (
          <div className="gc">
            <div className="gc-paint" aria-hidden="true">
              {DRIPS.map((d, i) => (
                <i key={i} style={{ "--x": d.x, "--w": `${d.w}px`, "--l": `${d.l}px` }} />
              ))}
            </div>

            <h1 className="gc-title" aria-label={judul}>
              {judul.split("").map((c, i) => (
                <span key={i} aria-hidden="true">{c}</span>
              ))}
            </h1>

            {/* Lencana dengan efek glitch */}
            <span className="tape">
              <span className="tg" data-text={tape}>{tape}</span>
            </span>

            {user ? (
              <div className="gc-body">
                <p className="gc-info">
                  Kamu masuk sebagai <b>{user.nama || "Mahasiswa"}</b>
                  <br />
                  NPM <b>{"••••" + user.npm.slice(-4)}</b>
                </p>
                <Link href="/daftar-saya" className="btn gc-go">
                  Buka daftar saya
                </Link>
                <button type="button" className="gc-alt" onClick={keluar}>
                  <LogOut size={15} /> Ganti akun / keluar
                </button>
              </div>
            ) : (
              <form className="gc-body" onSubmit={kirim} noValidate>
                {/* 1. Username (NPM) */}
                <label className={`gf${fieldErr === "npm" ? " err" : ""}`}>
                  <span className="gf-l"><Hash size={14} /> NPM (username)</span>
                  <span className="gf-in">
                    <input
                      value={npm}
                      onChange={(e) => setNpm(e.target.value.replace(/\D/g, "").slice(0, 15))}
                      inputMode="numeric"
                      autoComplete="username"
                      placeholder="mis. 2210123456"
                      aria-invalid={fieldErr === "npm"}
                    />
                  </span>
                </label>

                {/* 2. Password */}
                <label className={`gf${fieldErr === "pw" ? " err" : ""}`}>
                  <span className="gf-l"><KeyRound size={14} /> Password</span>
                  <span className="gf-in">
                    <input
                      type={lihat ? "text" : "password"}
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      autoComplete="current-password"
                      placeholder={samaNpm ? "Sama dengan NPM" : "Password-mu"}
                      aria-invalid={fieldErr === "pw"}
                    />
                    <button
                      type="button"
                      className="gf-eye"
                      onClick={() => setLihat((v) => !v)}
                      aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
                    >
                      {lihat ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </span>
                  {samaNpm && (
                    <span className="gf-hint">
                      <span>Password mahasiswa = NPM.</span>
                      <button type="button" className="gf-link" onClick={() => setPw(npm)} disabled={!npm}>
                        Isi otomatis
                      </button>
                    </span>
                  )}
                </label>

                {/* 3. Nama panggilan */}
                <label className="gf">
                  <span className="gf-l"><UserRound size={14} /> Nama panggilan <em>(opsional)</em></span>
                  <span className="gf-in">
                    <input
                      value={nama}
                      onChange={(e) => setNama(e.target.value.slice(0, 30))}
                      autoComplete="nickname"
                      placeholder="Biar disapa namamu"
                    />
                  </span>
                </label>

                {err && (
                  <p className="gc-err" role="alert">
                    {err}
                  </p>
                )}

                <button type="submit" className="btn gc-go" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner" /> Menyiapkan…
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Masuk sekarang
                    </>
                  )}
                </button>

                <p className="gc-foot">
                  Belum punya akun? Langsung masuk saja, akun dibuat otomatis.
                  <br />
                  <Link href="/katalog">Lanjut tanpa akun</Link>
                </p>
              </form>
            )}

            <AdminGlyph />
          </div>
        )}

        <p className="gw-hint">
          <span>Klik dinding untuk menyemprot cat</span>
          {splats.length > 0 && (
            <button type="button" className="gw-clear" onClick={() => setSplats([])}>
              Bersihkan
            </button>
          )}
        </p>
      </div>

      {/* Lapisan cat saat berhasil masuk */}
      <div className="wipe" ref={wipeRef} aria-hidden="true">
        <div className="w-fill" />
        <Splat seed={77} className="w-splat" />
        <p className="w-msg">{pesan}</p>
      </div>
    </section>
  );
}

export default function MasukPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="empty">Memuat…</div>}>
        <MasukIsi />
      </Suspense>
    </PageShell>
  );
}