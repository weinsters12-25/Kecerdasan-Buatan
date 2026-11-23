"use client";

import { useState } from "react";
import { hueDariTeks } from "../lib/api";

// size: "xs" | "sm" | "md" | "lg"
// Jika gambar kosong atau gagal dimuat, tampil sampul pengganti (huruf pertama).
export default function BookCover({ buku, size = "sm" }) {
  const [gagal, setGagal] = useState(false);
  const adaGambar = buku.gambar && !gagal;

  return (
    <div className={`bc bc-${size}`} aria-hidden="true">
      {adaGambar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={buku.gambar}
          alt=""
          loading="lazy"
          onError={() => setGagal(true)}
        />
      ) : (
        <div className="bc-fallback" style={{ "--h": hueDariTeks(buku.kategori) }}>
          {(buku.judul || "?").charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}