"use client";

import { useRef } from "react";
import Link from "next/link";
import BookCover from "./BookCover";
import useTilt from "../lib/useTilt";
import { hueDariTeks } from "../lib/api";

export default function CategoryCard({ k, aktif = false, href }) {
  const ref = useRef(null);
  useTilt(ref, 7);

  const sampul = k.sampul.length ? k.sampul : [""];
  return (
    <Link
      ref={ref}
      href={href}
      scroll={false}
      className="cat"
      aria-current={aktif ? "true" : undefined}
      style={{ "--h": hueDariTeks(k.nama) }}
    >
      <div className="cat-covers">
        {sampul.map((url, i) => (
          <BookCover key={i} size="xs" buku={{ judul: k.nama, kategori: k.nama, gambar: url }} />
        ))}
      </div>
      <strong>{k.nama}</strong>
      <small>{k.jumlah} buku</small>
    </Link>
  );
}