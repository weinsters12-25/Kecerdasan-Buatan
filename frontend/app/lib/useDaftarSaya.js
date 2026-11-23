"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { API } from "./api";

/* Satu penyimpanan bersama untuk akun + daftar bacaan.
   - Tamu   : daftar disimpan di localStorage browser.
   - Masuk  : daftar disimpan di server (per NPM), localStorage hanya cadangan. */

const K_IDS = "pp-daftar-saya";
const K_TOKEN = "pp-token";
const K_USER = "pp-user";
const K_CACHE = "pp-daftar-akun";

const AWAL = { ids: [], token: "", user: null, siap: false };
let state = AWAL;
let dimulai = false;
let antrean = Promise.resolve();
const listeners = new Set();

const set = (p) => {
  state = { ...state, ...p };
  listeners.forEach((f) => f());
};

const baca = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : d;
  } catch {
    return d;
  }
};
const tulis = (k, v) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

async function req(path, { method = "GET", body, token } = {}) {
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Tidak bisa terhubung ke server. Pastikan Uvicorn berjalan.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    const detail = data?.detail;
    const e = new Error(typeof detail === "string" ? detail : `Permintaan gagal (HTTP ${res.status}).`);
    e.status = res.status;
    throw e;
  }
  return data;
}

const bersihkanSesi = () => {
  tulis(K_TOKEN, null);
  tulis(K_USER, null);
  tulis(K_CACHE, null);
  set({ token: "", user: null, ids: [], siap: true });
};

function mulai() {
  if (dimulai || typeof window === "undefined") return;
  dimulai = true;
  const token = baca(K_TOKEN, "");
  const user = baca(K_USER, null);
  const lokal = (baca(K_IDS, []) || []).map(Number);

  if (!token) {
    set({ token: "", user: null, ids: lokal, siap: true });
    return;
  }
  // tampilkan cadangan dulu, lalu segarkan dari server
  set({ token, user, ids: (baca(K_CACHE, []) || []).map(Number), siap: true });
  Promise.all([req("/api/auth/saya", { token }), req("/api/daftar-saya", { token })])
    .then(([u, d]) => {
      tulis(K_CACHE, d.ids);
      set({ user: { npm: u.npm, nama: u.nama }, ids: d.ids });
    })
    .catch((e) => {
      if (e.status === 401) bersihkanSesi();
    });
}

const sinkron = (ids) => {
  const token = state.token;
  if (!token) return;
  antrean = antrean
    .then(() => req("/api/daftar-saya", { method: "PUT", body: { ids }, token }))
    .catch((e) => {
      if (e.status === 401) bersihkanSesi();
    });
};

const simpan = (ids) => {
  set({ ids });
  if (state.token) {
    tulis(K_CACHE, ids);
    sinkron(ids);
  } else {
    tulis(K_IDS, ids);
  }
};

function toggle(id) {
  const n = Number(id);
  simpan(state.ids.includes(n) ? state.ids.filter((x) => x !== n) : [...state.ids, n]);
}

const kosongkan = () => simpan([]);

async function masuk(npm, password, nama = "") {
  const d = await req("/api/auth/masuk", { method: "POST", body: { npm, password, nama } });
  const lokal = (baca(K_IDS, []) || []).map(Number);
  const gabung = [...new Set([...d.ids, ...lokal])];
  const user = { npm: d.npm, nama: d.nama };

  tulis(K_TOKEN, d.token);
  tulis(K_USER, user);
  tulis(K_CACHE, gabung);
  tulis(K_IDS, []); // daftar tamu sudah dipindah ke akun
  set({ token: d.token, user, ids: gabung, siap: true });

  const digabung = gabung.length - d.ids.length;
  if (digabung > 0) sinkron(gabung);
  return { baru: d.baru, nama: d.nama, npm: d.npm, digabung };
}

function keluar() {
  const token = state.token;
  bersihkanSesi();
  if (token) req("/api/auth/keluar", { method: "POST", token }).catch(() => {});
}

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const snapshot = () => state;
const snapshotServer = () => AWAL;
export const getToken = () => state.token;

function useStore() {
  const s = useSyncExternalStore(subscribe, snapshot, snapshotServer);
  useEffect(() => {
    mulai();
  }, []);
  return s;
}

export function useDaftarSaya() {
  const s = useStore();
  const ada = useCallback((id) => s.ids.includes(Number(id)), [s.ids]);
  return { ids: s.ids, ada, toggle, kosongkan, siap: s.siap };
}

export function useAkun() {
  const s = useStore();
  return { user: s.user, siap: s.siap, masuk, keluar };
}