import { API } from "./api";

const K = "pp-admin-key";

export const ambilKunci = () =>
  typeof window === "undefined" ? "" : sessionStorage.getItem(K) || "";
export const simpanKunci = (k) => sessionStorage.setItem(K, k);
export const hapusKunci = () => sessionStorage.removeItem(K);

async function adm(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-Admin-Key": ambilKunci() },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error("Tidak bisa terhubung ke server."), { status: 0 });
  }
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const detail = data?.detail;
    throw Object.assign(
      new Error(typeof detail === "string" ? detail : `Permintaan gagal (HTTP ${res.status}).`),
      { status: res.status }
    );
  }
  return data;
}

export const cek = () => adm("/api/admin/cek");
export const status = () => adm("/api/admin/status");
export const daftar = () => adm("/api/admin/buku");
export const tambah = (v) => adm("/api/admin/buku", { method: "POST", body: v });
export const ubah = (id, v) => adm(`/api/admin/buku/${id}`, { method: "PUT", body: v });
export const hapus = (id) => adm(`/api/admin/buku/${id}`, { method: "DELETE" });
export const terapkan = () => adm("/api/admin/terapkan", { method: "POST" });

export async function cover(id, file) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Gagal membaca file gambar."));
    r.readAsDataURL(file);
  });
  const data = String(dataUrl).split(",")[1];
  const ekstensi = (file.name.split(".").pop() || "").toLowerCase();
  return adm(`/api/admin/cover/${id}`, { method: "POST", body: { ekstensi, data } });
}

export const getTerbaikAdmin = () => adm("/api/admin/terbaik");
export const setTerbaikAdmin = (v) => adm("/api/admin/terbaik", { method: "PUT", body: v });