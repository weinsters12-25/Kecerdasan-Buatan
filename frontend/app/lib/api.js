// Satu tempat untuk alamat API. Ubah lewat file .env.local bila perlu:
// NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
export const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

async function ambil(path, opsi) {
  const res = await fetch(`${API}${path}`, opsi);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ---------- Warna kategori: unik per kategori ---------- */
// Nama kategori yang sudah dikenal. Diurutkan, lalu tiap kategori mendapat
// sudut warna dengan selisih "golden angle" supaya semuanya berjauhan.
const dikenal = new Set();
let petaWarna = {};

export const daftarkanKategori = (nama = []) => {
  let baru = false;
  nama.forEach((n) => {
    if (n && !dikenal.has(n)) {
      dikenal.add(n);
      baru = true;
    }
  });
  if (!baru) return;
  const urut = [...dikenal].sort((a, b) => a.localeCompare(b));
  petaWarna = {};
  urut.forEach((n, i) => {
    petaWarna[n] = Math.round((i * 137.508 + 215) % 360);
  });
};

export const hueDariTeks = (teks = "") => {
  if (petaWarna[teks] !== undefined) return petaWarna[teks];
  // cadangan sebelum data kategori sampai
  let h = 0;
  for (const ch of teks) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};

/* ---------- Endpoint ---------- */
export const getKategori = () =>
  ambil("/api/kategori").then((d) => {
    daftarkanKategori(d.map((k) => k.nama));
    return d;
  });

export const getBuku = (kategori = "", q = "") => {
  const p = new URLSearchParams();
  if (kategori) p.set("kategori", kategori);
  if (q) p.set("q", q);
  const qs = p.toString();
  return ambil(`/api/buku${qs ? `?${qs}` : ""}`).then((d) => {
    if (Array.isArray(d)) daftarkanKategori(d.map((b) => b.kategori));
    return d;
  });
};

export const getDetail = (id) => ambil(`/api/buku/detail/${id}`);

export const getRekomendasiAcuan = (id) => ambil(`/api/rekomendasi/${id}`);

export const cariTeks = (teks, kategori = null) =>
  ambil("/api/rekomendasi/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teks, kategori }),
  });

export const getGraf = (top = 5, minSkor = 0.1) =>
  ambil(`/api/graf?top=${top}&min_skor=${minSkor}`).then((d) => {
    if (d?.nodes) daftarkanKategori(d.nodes.map((n) => n.kategori));
    return d;
  });

export const getTerbaik = (n = 3) => ambil(`/api/terbaik?n=${n}`);

export const getRekomDaftar = (ids, n = 6) =>
  ambil("/api/rekomendasi/dari-daftar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, n }),
  });