"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Sparkles, 
  CheckCircle2, 
  Award, 
  Zap, 
  Search, 
  ListFilter, 
  X, 
  Info, 
  User, 
  Building, 
  Calendar, 
  FileText,
  ChevronRight
} from "lucide-react";

export default function Home() {
  const [mode, setMode] = useState("text");
  const [daftarBuku, setDaftarBuku] = useState([]);
  const [idBuku, setIdBuku] = useState("");
  const [inputTeks, setInputTeks] = useState("");
  const [hasil, setHasil] = useState(null);
  const [loading, setLoading] = useState(false);

  // State untuk Pop-up Modal Detail Buku
  const [selectedBookDetail, setSelectedBookDetail] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/buku")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDaftarBuku(data);
          setIdBuku(data[0].id_buku.toString());
        }
      })
      .catch((err) => console.error("Gagal memuat daftar buku", err));
  }, []);

  const handleCari = async () => {
    setLoading(true);
    try {
      let res, data;
      if (mode === "dropdown") {
        res = await fetch(`http://127.0.0.1:8000/api/rekomendasi/${idBuku}`);
        data = await res.json();
      } else {
        if (!inputTeks.trim()) {
          alert("Masukkan kata kunci pencarian!");
          setLoading(false);
          return;
        }
        res = await fetch("http://127.0.0.1:8000/api/rekomendasi/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teks: inputTeks })
        });
        data = await res.json();
      }
      setHasil(data);
    } catch (error) {
      alert("Gagal terhubung ke server Python! Pastikan Uvicorn sudah berjalan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#030712",
      color: "#f3f4f6",
      fontFamily: "'Inter', sans-serif",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px 20px",
      position: "relative",
      overflow: "hidden"
    }}>
      
      {/* Background Grid Pattern */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `
          linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      {/* Aurora Blobs */}
      <motion.div
        animate={{ x: [-50, 50, -50], y: [-30, 30, -30], scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
        style={{
          position: "absolute", top: "10%", left: "15%", width: "400px", height: "400px",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(0,0,0,0) 70%)",
          filter: "blur(60px)", pointerEvents: "none", zIndex: 0
        }}
      />
      <motion.div
        animate={{ x: [40, -40, 40], y: [40, -40, 40], scale: [1.2, 1, 1.2] }}
        transition={{ repeat: Infinity, duration: 18, ease: "easeInOut" }}
        style={{
          position: "absolute", bottom: "10%", right: "15%", width: "450px", height: "450px",
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.25) 0%, rgba(0,0,0,0) 70%)",
          filter: "blur(70px)", pointerEvents: "none", zIndex: 0
        }}
      />

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        style={{
          width: "100%", maxWidth: "850px", backgroundColor: "rgba(15, 23, 42, 0.82)",
          backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "24px", padding: "30px 40px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.8)",
          position: "relative", zIndex: 1
        }}
      >
        {/* Animated Glowing AI Orb */}
        <div style={{ height: "150px", width: "100%", marginBottom: "10px", display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
            style={{ position: "absolute", width: "130px", height: "130px", borderRadius: "50%", border: "2px dashed rgba(99, 102, 241, 0.4)" }}
          />
          <motion.div
            animate={{ scale: [1, 1.12, 1], boxShadow: ["0 0 20px rgba(99, 102, 241, 0.4)", "0 0 45px rgba(168, 85, 247, 0.7)", "0 0 20px rgba(99, 102, 241, 0.4)"] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            style={{ width: "85px", height: "85px", borderRadius: "50%", background: "radial-gradient(circle at 30% 30%, #818cf8, #4f46e5 60%, #312e81)", display: "flex", justifyContent: "center", alignItems: "center" }}
          >
            <BookOpen size={34} color="#ffffff" />
          </motion.div>
        </div>

        {/* Title */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "800", margin: "0 0 8px 0", background: "linear-gradient(to right, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Sistem Rekomendasi Buku & Jurnal
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
            Eksplorasi keterkaitan antar-dokumen dengan analisis LLM Gemini & TF-IDF.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "15px" }}>
          <button
            onClick={() => { setMode("text"); setHasil(null); }}
            style={{
              padding: "8px 16px", borderRadius: "20px", border: "1px solid #334155",
              backgroundColor: mode === "text" ? "#4f46e5" : "#0f172a",
              color: mode === "text" ? "#fff" : "#94a3b8", cursor: "pointer", fontSize: "13px",
              display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            <Search size={14} /> Ketik Kata Kunci / Topik
          </button>
          <button
            onClick={() => { setMode("dropdown"); setHasil(null); }}
            style={{
              padding: "8px 16px", borderRadius: "20px", border: "1px solid #334155",
              backgroundColor: mode === "dropdown" ? "#4f46e5" : "#0f172a",
              color: mode === "dropdown" ? "#fff" : "#94a3b8", cursor: "pointer", fontSize: "13px",
              display: "flex", alignItems: "center", gap: "6px"
            }}
          >
            <ListFilter size={14} /> Pilih dari Daftar Buku
          </button>
        </div>

        {/* Form Selection */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "25px", backgroundColor: "#0f172a", padding: "10px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          {mode === "dropdown" ? (
            <select 
              value={idBuku} 
              onChange={(e) => setIdBuku(e.target.value)}
              style={{ flex: 1, padding: "12px 16px", fontSize: "14px", color: "#f8fafc", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", outline: "none", cursor: "pointer" }}
            >
              {daftarBuku.map((b) => (
                <option key={b.id_buku} value={b.id_buku}>
                  [{b.kategori}] {b.judul}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="Contoh: Saya ingin belajar koding python..."
              value={inputTeks}
              onChange={(e) => setInputTeks(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCari()}
              style={{ flex: 1, padding: "12px 16px", fontSize: "14px", color: "#f8fafc", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "12px", outline: "none" }}
            />
          )}

          <motion.button 
            whileHover={{ scale: 1.04, boxShadow: "0 0 20px rgba(99, 102, 241, 0.6)" }}
            whileTap={{ scale: 0.96 }}
            onClick={handleCari}
            disabled={loading}
            style={{ padding: "12px 28px", background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white", border: "none", cursor: loading ? "not-allowed" : "pointer", borderRadius: "12px", fontWeight: "600", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}
          >
            {loading ? <span>Memproses...</span> : <><Zap size={16} color="#ffd700" /><span>Cari AI</span></>}
          </motion.button>
        </div>

        {/* Hasil Rekomendasi */}
        <AnimatePresence mode="wait">
          {hasil && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }}
              style={{ borderTop: "1px solid #334155", paddingTop: "20px" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "20px", backgroundColor: "rgba(99, 102, 241, 0.12)", padding: "12px 18px", borderRadius: "12px", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
                <CheckCircle2 size={18} color="#818cf8" style={{ marginTop: "2px", flexShrink: 0 }} />
                <span style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: "1.5" }}>
                  <strong style={{ color: "#a5b4fc" }}>{hasil.buku_acuan}</strong>
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "600", margin: 0, color: "#e2e8f0", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={18} color="#c084fc" /> Hasil Rekomendasi Terkait:
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>(Klik kartu untuk detail)</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {hasil.rekomendasi && hasil.rekomendasi.map((buku, index) => {
                  const persentase = (buku.skor_kemiripan * 100).toFixed(0);

                  return (
                    <motion.div 
                      key={buku.id_buku}
                      initial={{ opacity: 0, x: -30 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ duration: 0.3, delay: index * 0.12 }}
                      whileHover={{ 
                        y: -4,
                        scale: 1.01,
                        backgroundColor: "#162032",
                        borderColor: "#6366f1",
                        boxShadow: "0 12px 30px -8px rgba(99, 102, 241, 0.35)"
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedBookDetail(buku)}
                      style={{ 
                        border: "1px solid #334155", 
                        borderRadius: "14px", 
                        padding: "16px 20px", 
                        backgroundColor: "#0f172a", 
                        transition: "border-color 0.2s, background-color 0.2s",
                        cursor: "pointer",
                        position: "relative"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div>
                          <h4 style={{ margin: "0 0 6px 0", fontSize: "16px", color: "#f8fafc", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
                            {buku.judul}
                            <ChevronRight size={16} color="#818cf8" style={{ opacity: 0.7 }} />
                          </h4>
                          <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "20px", backgroundColor: "#1e293b", color: "#94a3b8", border: "1px solid #334155" }}>
                            {buku.kategori}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "12px", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontWeight: "700", fontSize: "13px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                          <Award size={14} /> {persentase}% Match
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ width: "100%", height: "6px", backgroundColor: "#1e293b", borderRadius: "10px", overflow: "hidden", marginTop: "12px" }}>
                        <motion.div 
                          initial={{ width: 0 }} animate={{ width: `${persentase}%` }} transition={{ duration: 0.8, delay: index * 0.15 }}
                          style={{ height: "100%", background: persentase > 20 ? "linear-gradient(to right, #10b981, #34d399)" : "linear-gradient(to right, #6366f1, #818cf8)", borderRadius: "10px" }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* MODAL POP-UP DESAIN 21ST.DEV (Glow, Glassmorphism, Floating Animation) */}
      <AnimatePresence>
        {selectedBookDetail && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(3, 7, 18, 0.75)",
            backdropFilter: "blur(12px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}>
            {/* Kartu dengan animasi melayang (floating effect dari 21st.dev) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: [0, -8, 0]
              }}
              exit={{ opacity: 0, scale: 0.85, y: 30 }}
              transition={{ 
                y: { repeat: Infinity, duration: 4, ease: "easeInOut" },
                opacity: { duration: 0.3 },
                scale: { duration: 0.3 }
              }}
              style={{
                width: "100%",
                maxWidth: "520px",
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(129, 140, 248, 0.3)",
                borderRadius: "24px",
                padding: "24px",
                boxShadow: "0 0 40px rgba(99, 102, 241, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.9)",
                position: "relative",
                overflow: "hidden"
              }}
            >
              {/* Decorative Animated Grid Graphic (21st.dev Style Header) */}
              <div style={{
                position: "relative",
                height: "90px",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                marginBottom: "20px",
                background: "radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.2) 0%, rgba(15, 23, 42, 0.8) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 20px"
              }}>
                <div style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                  opacity: 0.6
                }} />

                <div style={{ position: "relative", zIndex: 2 }}>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "#a5b4fc",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    backgroundColor: "rgba(99, 102, 241, 0.2)",
                    border: "1px solid rgba(129, 140, 248, 0.4)",
                    backdropFilter: "blur(4px)"
                  }}>
                    {selectedBookDetail.kategori}
                  </span>
                  <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#ffffff", marginTop: "8px", marginBottom: 0 }}>
                    {selectedBookDetail.judul}
                  </h2>
                </div>

                <button
                  onClick={() => setSelectedBookDetail(null)}
                  style={{
                    position: "relative",
                    zIndex: 2,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#f8fafc",
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backdropFilter: "blur(4px)"
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Gradient Divider Line */}
              <div style={{ height: "1px", background: "linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent)", marginBottom: "20px" }} />

              {/* Grid Atribut Informasi (Glass Card Style) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div style={{ backgroundColor: "rgba(3, 7, 18, 0.6)", padding: "12px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <User size={16} color="#818cf8" />
                  <div>
                    <span style={{ display: "block", fontSize: "10px", color: "#64748b" }}>Penulis</span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>{selectedBookDetail.penulis || "-"}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: "rgba(3, 7, 18, 0.6)", padding: "12px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Building size={16} color="#818cf8" />
                  <div>
                    <span style={{ display: "block", fontSize: "10px", color: "#64748b" }}>Penerbit</span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>{selectedBookDetail.penerbit || "-"}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: "rgba(3, 7, 18, 0.6)", padding: "12px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <Calendar size={16} color="#818cf8" />
                  <div>
                    <span style={{ display: "block", fontSize: "10px", color: "#64748b" }}>Tahun Terbit</span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>{selectedBookDetail.tahun_terbit || "-"}</span>
                  </div>
                </div>

                <div style={{ backgroundColor: "rgba(3, 7, 18, 0.6)", padding: "12px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", gap: "10px" }}>
                  <FileText size={16} color="#818cf8" />
                  <div>
                    <span style={{ display: "block", fontSize: "10px", color: "#64748b" }}>Jumlah Halaman</span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: "#e2e8f0" }}>{selectedBookDetail.jumlah_halaman ? `${selectedBookDetail.jumlah_halaman} Hal.` : "-"}</span>
                  </div>
                </div>
              </div>

              {/* Deskripsi Buku */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Info size={14} color="#818cf8" /> Deskripsi Buku
                </h4>
                <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.6", backgroundColor: "rgba(3, 7, 18, 0.6)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.08)", margin: 0, maxHeight: "140px", overflowY: "auto" }}>
                  {selectedBookDetail.deskripsi || "Tidak ada deskripsi tersedia."}
                </p>
              </div>

              {/* Action Button (Style 21st.dev Glow Button) */}
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 25px rgba(99, 102, 241, 0.6)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedBookDetail(null)}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer"
                }}
              >
                Tutup Detail
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}