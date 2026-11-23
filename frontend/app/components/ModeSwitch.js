"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cpu, Sparkles, Type, X } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const OPSI = [
  {
    id: "hybrid",
    label: "Hybrid",
    ikon: Sparkles,
    info: "Memahami makna dan kata kunci",
    detail: "Embedding Gemini + TF-IDF",
  },
  {
    id: "tfidf",
    label: "TF-IDF",
    ikon: Type,
    info: "Hanya mencocokkan kata",
    detail: "Cepat, tanpa AI",
  },
];

/**
 * Saklar mesin pencarian (tersembunyi).
 * - tampil   : true -> panel terlihat (diatur dari page.js lewat shortcut)
 * - onTutup  : dipanggil saat tombol tutup ditekan
 * - onReady  : dipanggil sekali saat mode awal dari server diketahui
 * - onChange : dipanggil setelah pengguna berhasil mengganti mode
 */
export default function ModeSwitch({ tampil = false, onTutup, onChange, onReady }) {
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/mode`)
      .then((r) => r.json())
      .then((d) => {
        setMode(d.mode);
        onReady?.(d.mode);
      })
      .catch(() => setError("Server belum terhubung."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pilih(target) {
    if (loading || target === mode) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/api/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: target }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Gagal mengganti mode.");
      setMode(d.mode);
      onChange?.(d.mode);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence initial={false}>
      {tampil && (
        <motion.div
          key="dev"
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: "auto", marginTop: 16 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
          style={{ overflow: "hidden" }}
        >
          <div className="dev" role="region" aria-label="Mode pengembang">
            <div className="dev-head">
              <span className="dev-title">
                <Cpu size={16} /> Mode pengembang
              </span>
              <button type="button" className="dev-x" onClick={onTutup} aria-label="Tutup mode pengembang">
                <X size={15} />
              </button>
            </div>

            <div className="dev-opts" role="radiogroup" aria-label="Mesin pencarian">
              {OPSI.map((o) => {
                const Ikon = o.ikon;
                const dipilih = mode === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    role="radio"
                    aria-checked={dipilih}
                    className="dev-opt"
                    disabled={loading || !mode}
                    onClick={() => pilih(o.id)}
                  >
                    {dipilih && (
                      <motion.span
                        layoutId="dev-pill"
                        className="dev-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="dev-ic">
                      <Ikon size={18} />
                    </span>
                    <span className="dev-tx">
                      <strong>{o.label}</strong>
                      <small>{o.info}</small>
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="dev-foot">
              {loading && (
                <>
                  <span className="spinner" style={{ width: 12, height: 12 }} /> Mengganti mesin…
                </>
              )}
              {!loading && !error && mode && <>Aktif: {OPSI.find((o) => o.id === mode)?.detail}</>}
              {!loading && !mode && !error && <>Memuat…</>}
              {error && (
                <span role="alert" style={{ color: "#ff6b81" }}>
                  {error}
                </span>
              )}
              <span className="dev-keys">
                <kbd className="kbd">Alt</kbd>
                <kbd className="kbd">Shift</kbd>
                <kbd className="kbd">M</kbd> tutup
              </span>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}