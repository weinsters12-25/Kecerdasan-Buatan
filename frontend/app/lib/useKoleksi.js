"use client";

import { useEffect, useSyncExternalStore } from "react";
import { API } from "./api";
import { getToken, useAkun } from "./useDaftarSaya";

/* Status baca + catatan pribadi.
   - Tamu  : disimpan di localStorage.
   - Masuk : disimpan di server per NPM; data tamu digabung saat pertama masuk. */

const K_STATUS = "pp-status";
const K_CATATAN = "pp-catatan";

export const STATUS_BACA = ["ingin", "sedang", "selesai"];

const AWAL = { status: {}, catatan: {}, siap: false, npm: null };
let state = AWAL;
let terakhir; // undefined = belum pernah disinkronkan
const listeners = new Set();

const set = (p) => {
  state = { ...state, ...p };
  listeners.forEach((f) => f());
};

const baca = (k) => {
  try {
    const v = JSON.parse(localStorage.getItem(k) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
};
const tulis = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

async function req(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function sinkron(npm) {
  if (terakhir === npm) return;
  terakhir = npm;

  if (!npm) {
    set({ status: baca(K_STATUS), catatan: baca(K_CATATAN), siap: true, npm: null });
    return;
  }

  set({ siap: false, npm });
  try {
    const [s, c] = await Promise.all([req("/api/saya/status"), req("/api/saya/catatan")]);
    if (terakhir !== npm) return;
    const ls = baca(K_STATUS);
    const lc = baca(K_CATATAN);
    set({
      status: { ...ls, ...s.status }, // data akun menang bila bentrok
      catatan: { ...lc, ...c.catatan },
      siap: true,
      npm,
    });

    // pindahkan data tamu yang belum ada di akun
    const tugas = [];
    Object.entries(ls).forEach(([id, v]) => {
      if (!(id in s.status)) tugas.push(req(`/api/saya/status/${id}`, { method: "PUT", body: { status: v } }));
    });
    Object.entries(lc).forEach(([id, v]) => {
      if (!(id in c.catatan)) tugas.push(req(`/api/saya/catatan/${id}`, { method: "PUT", body: { teks: v } }));
    });
    await Promise.allSettled(tugas);
    tulis(K_STATUS, {});
    tulis(K_CATATAN, {});
  } catch {
    terakhir = undefined; // coba lagi pada kunjungan berikutnya
    if (state.npm === npm) set({ siap: true, status: {}, catatan: {} });
  }
}

function setStatus(id, nilai) {
  const baru = { ...state.status };
  if (nilai) baru[String(id)] = nilai;
  else delete baru[String(id)];
  set({ status: baru });
  if (getToken()) {
    req(`/api/saya/status/${id}`, { method: "PUT", body: { status: nilai || "" } }).catch(() => {});
  } else {
    tulis(K_STATUS, baru);
  }
}

function simpanCatatan(id, teks) {
  const isi = (teks || "").trim();
  const baru = { ...state.catatan };
  if (isi) baru[String(id)] = isi.slice(0, 2000);
  else delete baru[String(id)];
  set({ catatan: baru });
  if (getToken()) {
    req(`/api/saya/catatan/${id}`, { method: "PUT", body: { teks: isi } }).catch(() => {});
  } else {
    tulis(K_CATATAN, baru);
  }
}

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useKoleksi() {
  const { user, siap } = useAkun();
  const npm = user?.npm ?? null;
  const s = useSyncExternalStore(subscribe, () => state, () => AWAL);

  useEffect(() => {
    if (siap) sinkron(npm);
  }, [siap, npm]);

  return {
    status: s.status,
    catatan: s.catatan,
    siap: s.siap,
    npm: s.npm,
    setStatus,
    simpanCatatan,
  };
}