"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, MousePointerClick } from "lucide-react";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from "d3-force";
import BookCover from "./BookCover";
import BookmarkButton from "./BookmarkButton";
import { hueDariTeks } from "../lib/api";

const potong = (s, n = 26) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default function PetaKemiripan({ data, fokus = "" }) {
  const boxRef = useRef(null);
  const svgRef = useRef(null);
  const simRef = useRef(null);
  const dragRef = useRef(null);
  const nodeEls = useRef({});
  const linkEls = useRef([]);

  const [size, setSize] = useState({ w: 900, h: 560 });
  const [ambang, setAmbang] = useState(30); // persen
  const [pilih, setPilih] = useState(fokus ? Number(fokus) : null);
  const [kat, setKat] = useState("");

  /* ----- ukuran kanvas mengikuti lebar kotak ----- */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.round(e.contentRect.width);
      setSize({ w, h: Math.round(Math.min(Math.max(w * 0.62, 440), 640)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ----- data turunan ----- */
  const nodes = useMemo(() => data.nodes.map((n) => ({ ...n })), [data]); // d3 mengubah objek ini
  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id_buku, n])), [data]);
  const daftarKat = useMemo(() => [...new Set(data.nodes.map((n) => n.kategori))], [data]);
  const links = useMemo(() => data.links.filter((l) => l.skor >= ambang / 100), [data, ambang]);

  const derajat = useMemo(() => {
    const d = {};
    links.forEach((l) => {
      d[l.source] = (d[l.source] || 0) + 1;
      d[l.target] = (d[l.target] || 0) + 1;
    });
    return d;
  }, [links]);

  const tetangga = useMemo(() => {
    const m = new Map();
    const tambah = (a, b, s) => {
      if (!m.has(a)) m.set(a, []);
      m.get(a).push({ id: b, skor: s });
    };
    links.forEach((l) => {
      tambah(l.source, l.target, l.skor);
      tambah(l.target, l.source, l.skor);
    });
    return m;
  }, [links]);

  const radius = (d) => 8 + Math.min(derajat[d.id_buku] || 0, 6) * 1.5;

  /* ----- simulasi fisika ----- */
  useEffect(() => {
    const { w, h } = size;
    const jangkar = {};
    daftarKat.forEach((k, i) => {
      const a = (i / daftarKat.length) * Math.PI * 2 - Math.PI / 2;
      jangkar[k] = { x: w / 2 + Math.cos(a) * w * 0.3, y: h / 2 + Math.sin(a) * h * 0.3 };
    });

    const simLinks = links.map((l) => ({ ...l }));
    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink(simLinks)
          .id((d) => d.id_buku)
          .distance((l) => 120 - l.skor * 80)
          .strength((l) => 0.15 + l.skor * 0.5)
      )
      .force("charge", forceManyBody().strength(-50).distanceMax(160))
      .force("collide", forceCollide((d) => radius(d) + 8))
      .force("x", forceX((d) => jangkar[d.kategori].x).strength(0.12))
      .force("y", forceY((d) => jangkar[d.kategori].y).strength(0.14))
      .alpha(0.9)
      .on("tick", () => {
        nodes.forEach((n) => {
          n.x = Math.max(24, Math.min(w - 24, n.x));
          n.y = Math.max(24, Math.min(h - 30, n.y));
          nodeEls.current[n.id_buku]?.setAttribute("transform", `translate(${n.x},${n.y})`);
        });
        simLinks.forEach((l, i) => {
          const el = linkEls.current[i];
          if (!el) return;
          el.setAttribute("x1", l.source.x);
          el.setAttribute("y1", l.source.y);
          el.setAttribute("x2", l.target.x);
          el.setAttribute("y2", l.target.y);
        });
      });

    simRef.current = sim;
    return () => sim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, size, daftarKat, derajat]);

  /* ----- seret titik ----- */
  const mulaiDrag = (e, n) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { n, mx: e.clientX, my: e.clientY, gerak: false };
    n.fx = n.x;
    n.fy = n.y;
    simRef.current?.alphaTarget(0.25).restart();
  };
  const gerakDrag = (e) => {
    const d = dragRef.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.mx, e.clientY - d.my) > 4) d.gerak = true;
    const r = svgRef.current.getBoundingClientRect();
    d.n.fx = e.clientX - r.left;
    d.n.fy = e.clientY - r.top;
  };
  const akhiriDrag = () => {
    const d = dragRef.current;
    if (!d) return;
    d.n.fx = null;
    d.n.fy = null;
    simRef.current?.alphaTarget(0);
    if (!d.gerak) setPilih((p) => (p === d.n.id_buku ? null : d.n.id_buku));
    dragRef.current = null;
  };

  /* ----- sorotan ----- */
  const dekatPilih = useMemo(
    () => (pilih ? [...(tetangga.get(pilih) || [])].sort((a, b) => b.skor - a.skor) : []),
    [pilih, tetangga]
  );
  const setDekat = useMemo(() => new Set(dekatPilih.map((t) => t.id)), [dekatPilih]);

  const redup = (n) =>
    (pilih && n.id_buku !== pilih && !setDekat.has(n.id_buku)) || (kat && n.kategori !== kat);

  const buku = pilih ? byId.get(pilih) : null;

  return (
    <div className="pk">
      <div className="pk-main">
        <div className="pk-tools">
          <label className="pk-range">
            <span>Ambang kemiripan: <b>{ambang}%</b></span>
            <input
              type="range"
              min={10}
              max={80}
              value={ambang}
              onChange={(e) => setAmbang(Number(e.target.value))}
              aria-label="Ambang kemiripan"
            />
          </label>
          <span className="pk-stat">
            {data.nodes.length} buku · {links.length} hubungan
          </span>
        </div>

        <div className="filters" role="group" aria-label="Sorot kategori" style={{ margin: "0 0 12px" }}>
          <button type="button" className="fchip" aria-pressed={!kat} onClick={() => setKat("")}>
            Semua
          </button>
          {daftarKat.map((k) => (
            <button
              key={k}
              type="button"
              className="fchip"
              aria-pressed={kat === k}
              onClick={() => setKat(kat === k ? "" : k)}
            >
              <i className="pk-dot" style={{ "--h": hueDariTeks(k) }} /> {k}
            </button>
          ))}
        </div>

        <div className="pk-box" ref={boxRef}>
          <svg
            ref={svgRef}
            className="pk-svg"
            width={size.w}
            height={size.h}
            role="group"
            aria-label="Peta kemiripan antar buku"
            onPointerDown={(e) => e.target === e.currentTarget && setPilih(null)}
          >
            <g>
              {links.map((l, i) => {
                const hubung = pilih && (l.source === pilih || l.target === pilih);
                return (
                  <line
                    key={`${l.source}-${l.target}`}
                    ref={(el) => {
                      linkEls.current[i] = el;
                    }}
                    className={`pk-link${hubung ? " on" : ""}${pilih && !hubung ? " dim" : ""}`}
                    strokeWidth={1 + l.skor * 3}
                  />
                );
              })}
            </g>
            <g>
              {nodes.map((n) => (
                <g
                  key={n.id_buku}
                  ref={(el) => {
                    if (el) nodeEls.current[n.id_buku] = el;
                  }}
                  className={`pk-node${redup(n) ? " dim" : ""}${n.id_buku === pilih ? " sel" : ""}${
                    setDekat.has(n.id_buku) ? " on" : ""
                  }`}
                  style={{ "--h": hueDariTeks(n.kategori) }}
                  transform={`translate(${n.x || 0},${n.y || 0})`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${n.judul}, kategori ${n.kategori}`}
                  onPointerDown={(e) => mulaiDrag(e, n)}
                  onPointerMove={gerakDrag}
                  onPointerUp={akhiriDrag}
                  onPointerCancel={akhiriDrag}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPilih((p) => (p === n.id_buku ? null : n.id_buku));
                    }
                  }}
                >
                  <circle r={radius(n)} />
                  <text y={radius(n) + 15}>{potong(n.judul)}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>

      <aside className="pk-panel" aria-live="polite">
        {!buku ? (
          <div className="pk-hint">
            <MousePointerClick size={26} />
            <h3>Cara membaca peta</h3>
            <p>Setiap titik adalah satu buku, warnanya mengikuti kategori. Garis menghubungkan buku yang isinya mirip, makin tebal makin mirip.</p>
            <p>Klik titik untuk melihat tetangganya, seret untuk memindahkannya, dan geser slider untuk menampilkan hubungan yang lebih kuat saja.</p>
          </div>
        ) : (
          <div>
            <div className="pk-book">
              <BookCover buku={buku} size="md" />
              <div>
                <span className="tag" style={{ marginTop: 0 }}>{buku.kategori}</span>
                <h3>{buku.judul}</h3>
                <p>{buku.penulis}{buku.tahun_terbit ? ` · ${buku.tahun_terbit}` : ""}</p>
              </div>
            </div>

            <div className="pk-act">
              <Link href={`/buku/${buku.id_buku}`} className="btn">
                Lihat detail <ArrowRight size={16} />
              </Link>
              <BookmarkButton id={buku.id_buku} judul={buku.judul} />
            </div>

            <h4 className="pk-sub">
              {dekatPilih.length ? `Paling mirip (${dekatPilih.length})` : "Tidak ada buku yang cukup mirip pada ambang ini"}
            </h4>
            <ul className="pk-near">
              {dekatPilih.map((t) => {
                const b = byId.get(t.id);
                return (
                  <li key={t.id}>
                    <button type="button" onClick={() => setPilih(t.id)}>
                      <i className="pk-dot" style={{ "--h": hueDariTeks(b.kategori) }} />
                      <span>{b.judul}</span>
                      <b>{Math.round(t.skor * 100)}%</b>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}