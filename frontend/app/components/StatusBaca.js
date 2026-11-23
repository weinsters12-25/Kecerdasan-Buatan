"use client";

import { Bookmark, BookOpen, CheckCircle2 } from "lucide-react";
import { useDaftarSaya } from "../lib/useDaftarSaya";
import { useKoleksi } from "../lib/useKoleksi";

export const INFO_STATUS = {
  ingin: { label: "Ingin dibaca", Ikon: Bookmark },
  sedang: { label: "Sedang dibaca", Ikon: BookOpen },
  selesai: { label: "Selesai", Ikon: CheckCircle2 },
};

export default function StatusBaca({ id }) {
  const { ada, toggle } = useDaftarSaya();
  const { status, setStatus } = useKoleksi();
  const aktif = status[String(id)] || "";

  const pilih = (v) => {
    if (aktif === v) {
      setStatus(id, "");
      return;
    }
    setStatus(id, v);
    if (!ada(id)) toggle(id); // status otomatis memasukkan buku ke daftar
  };

  return (
    <div>
      <div className="st-seg" role="radiogroup" aria-label="Status baca">
        {Object.entries(INFO_STATUS).map(([k, { label, Ikon }]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={aktif === k}
            data-st={k}
            className="st-opt"
            onClick={() => pilih(k)}
          >
            <Ikon size={16} /> {label}
          </button>
        ))}
      </div>
      <small className="st-note">Memilih status otomatis memasukkan buku ke Daftar saya.</small>
    </div>
  );
}