"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, StickyNote } from "lucide-react";
import { useAkun } from "../lib/useDaftarSaya";
import { useKoleksi } from "../lib/useKoleksi";

const MAKS = 2000;

export default function CatatanBuku({ id }) {
  const { user } = useAkun();
  const { catatan, simpanCatatan, siap } = useKoleksi();
  const [teks, setTeks] = useState("");
  const [tanda, setTanda] = useState(""); // "" | "menunggu" | "tersimpan"
  const dimuat = useRef(false);
  const timer = useRef(null);
  const tunda = useRef(null); // { v } yang belum tersimpan

  // isi awal dari penyimpanan (sekali, setelah data siap)
  useEffect(() => {
    if (!siap || dimuat.current) return;
    dimuat.current = true;
    setTeks(catatan[String(id)] || "");
  }, [siap, catatan, id]);

  // simpan sisa ketikan saat meninggalkan halaman
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (tunda.current) simpanCatatan(id, tunda.current.v);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id]
  );

  const ubah = (v) => {
    const isi = v.slice(0, MAKS);
    setTeks(isi);
    setTanda("menunggu");
    tunda.current = { v: isi };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      simpanCatatan(id, isi);
      tunda.current = null;
      setTanda("tersimpan");
    }, 700);
  };

  return (
    <div className="note-box">
      <label className="note-l" htmlFor={`catatan-${id}`}>
        <StickyNote size={15} /> Catatan pribadi
      </label>
      <textarea
        id={`catatan-${id}`}
        className="note"
        rows={5}
        value={teks}
        disabled={!siap}
        onChange={(e) => ubah(e.target.value)}
        placeholder="Tulis ringkasan, kutipan penting, atau halaman yang ingin dibaca lagi…"
      />
      <div className="note-foot">
        <span className={`note-s ${tanda}`}>
          {tanda === "menunggu" && "Menyimpan…"}
          {tanda === "tersimpan" && (
            <>
              <Check size={14} /> Tersimpan
            </>
          )}
          {!tanda && (user ? "Tersimpan di akunmu." : "Tersimpan di browser ini.")}
        </span>
        <span className="note-c">
          {teks.length}/{MAKS}
        </span>
      </div>
      {!user && (
        <small className="note-hint">
          <Link href="/masuk?next=/daftar-saya">Masuk dengan NPM</Link> agar catatan tidak hilang
          dan bisa dibuka dari perangkat lain.
        </small>
      )}
    </div>
  );
}