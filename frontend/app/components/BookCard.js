"use client";

import { useRef } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import BookCover from "./BookCover";
import ScoreRing from "./ScoreRing";
import BookmarkButton from "./BookmarkButton";
import useTilt from "../lib/useTilt";

export default function BookCard({ buku, rank }) {
  const ref = useRef(null);
  useTilt(ref, 4);

  const ada = buku.skor_kemiripan != null;
  const persen = ada ? Math.round(buku.skor_kemiripan * 100) : null;

  return (
    <div className="item-wrap">
      <Link ref={ref} href={`/buku/${buku.id_buku}`} className="item">
        <BookCover buku={buku} size="sm" />
        <div className="item-body">
          <h3>{buku.judul}</h3>
          <div className="tags">
            {rank && <span className="tag rank">Terbaik #{rank}</span>}
            <span className="tag">{buku.kategori}</span>
          </div>
          <p className="item-meta">
            {buku.penulis}
            {buku.tahun_terbit ? ` · ${buku.tahun_terbit}` : ""}
          </p>
          {buku.alasan && (
            <p className="why">
              <Sparkles size={13} /> {buku.alasan}
            </p>
          )}
        </div>
        {ada && <ScoreRing skor={buku.skor_kemiripan} persen={persen} />}
      </Link>
      <BookmarkButton id={buku.id_buku} judul={buku.judul} />
    </div>
  );
}