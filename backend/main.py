import os
import re
import json
import hashlib
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import time

# Baca kunci dari file .env (opsional, butuh: pip install python-dotenv)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Stemmer bahasa Indonesia (opsional, butuh: pip install PySastrawi)
try:
    from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
    _stemmer = StemmerFactory().create_stemmer()
except ImportError:
    _stemmer = None

# ==============================================================================
# KONFIGURASI
# ==============================================================================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEN_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
EMB_MODEL = os.getenv("GEMINI_EMB_MODEL", "gemini-embedding-001")
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
HEADERS = {"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY}
TIMEOUT = 20

JUMLAH_HASIL = 3             # jumlah rekomendasi terbaik
MAKS_TERKAIT = 30            # maks. buku "terkait lainnya" pada pencarian teks
MAKS_TERKAIT_ACUAN = 12      # maks. buku "terkait lainnya" pada mode buku acuan
JUMLAH_SERUPA = 4            # buku serupa di halaman detail
BOBOT_EMB = 0.65
BOBOT_TFIDF = 0.35
EMB_LOW, EMB_HIGH = 0.60, 0.85
MIN_SKOR_HYBRID = 0.15
MIN_SKOR_TFIDF = 0.05
PAKAI_ALASAN_AI = os.getenv("ALASAN_AI", "true").lower() == "true"
DEBUG_SKOR = os.getenv("DEBUG_SKOR", "true").lower() == "true"

# Alamat publik backend (dipakai untuk membentuk URL gambar)
PUBLIC_URL = os.getenv("PUBLIC_URL", "http://127.0.0.1:8000").rstrip("/")

CACHE_FILE = Path("embeddings_cache.npz")
COVER_DIR = Path("covers")
COVER_DIR.mkdir(exist_ok=True)


class SearchQuery(BaseModel):
    teks: str
    kategori: str | None = None   # opsional: batasi hasil ke satu kategori


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gambar sampul dapat diakses di http://127.0.0.1:8000/covers/<nama-file>
app.mount("/covers", StaticFiles(directory=COVER_DIR), name="covers")

# ==============================================================================
# PRA-PEMROSESAN TEKS (stopword + stemming bahasa Indonesia)
# ==============================================================================
STOPWORDS = set("""
yang dan di ke dari untuk dengan pada dalam atau ini itu adalah akan juga serta
dapat bisa oleh sebagai agar saya aku gw gue kamu ingin mau pengen tolong cari
carikan buku tentang belajar mempelajari seputar terkait berupa hingga seperti
sebuah suatu para ada lebih sangat banyak the of and to in for a
""".split())

NORMALISASI = {"c++": "cpp", "node.js": "nodejs", "next.js": "nextjs",
               "vb.net": "vbnet", "ui/ux": "uiux", "ci/cd": "cicd"}

_cache_stem = {}


def _stem(kata):
    if _stemmer is None:
        return kata
    if kata not in _cache_stem:
        _cache_stem[kata] = _stemmer.stem(kata)
    return _cache_stem[kata]


def tokenize(teks):
    teks = teks.lower()
    for asal, ganti in NORMALISASI.items():
        teks = teks.replace(asal, ganti)
    kata = re.findall(r"[a-z0-9]+", teks)
    return [_stem(k) for k in kata if k not in STOPWORDS and len(k) > 1]

print("API KEY terbaca:", bool(GEMINI_API_KEY))
print("Awal key:", GEMINI_API_KEY[:4], "| panjang:", len(GEMINI_API_KEY))


# ==============================================================================
# LOAD DATASET + TF-IDF
# ==============================================================================
df_buku = pd.read_csv("buku.csv",on_bad_lines="skip", engine="python")

# Kolom opsional: dibuat otomatis bila belum ada di CSV
KOLOM_TEKS = ("penulis", "penerbit", "isbn", "gambar", "sinopsis")
for kol in KOLOM_TEKS:
    if kol not in df_buku.columns:
        df_buku[kol] = ""
df_buku = df_buku.fillna("")
for kol in KOLOM_TEKS:
    df_buku[kol] = df_buku[kol].astype(str).str.strip()
    if "deskripsi" in df_buku.columns:
        kosong = df_buku["sinopsis"].astype(str).str.strip() == ""
        df_buku.loc[kosong, "sinopsis"] = df_buku.loc[kosong, "deskripsi"].astype(str)

# Rapikan kategori: kosong -> "Tanpa Kategori"; "komputer" & "Komputer" digabung
_kat = df_buku["kategori"].astype(str).str.strip().replace("", "Tanpa Kategori")
_kanon = _kat.groupby(_kat.str.lower()).agg(lambda s: s.value_counts().index[0])
df_buku["kategori"] = _kat.str.lower().map(_kanon)

# Judul dan kategori diberi bobot lebih besar daripada deskripsi
df_buku["fitur_teks"] = (
    (df_buku["judul"].astype(str) + " ") * 3
    + (df_buku["kategori"].astype(str) + " ") * 2
    + df_buku["sinopsis"].astype(str)
)

tfidf = TfidfVectorizer(
    tokenizer=tokenize,
    lowercase=False,
    token_pattern=None,
    ngram_range=(1, 2),
    sublinear_tf=True,
)
tfidf_matrix = tfidf.fit_transform(df_buku["fitur_teks"])
cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

# ==============================================================================
# GEMINI: TEKS & EMBEDDING
# ==============================================================================
def panggil_gemini(prompt, json_mode=False):
    """Kembalikan teks jawaban Gemini, atau None jika gagal."""
    if not GEMINI_API_KEY:
        return None
    body = {"contents": [{"parts": [{"text": prompt}]}]}
    if json_mode:
        body["generationConfig"] = {"responseMimeType": "application/json"}
    try:
        r = requests.post(f"{BASE_URL}/{GEN_MODEL}:generateContent",
                          headers=HEADERS, json=body, timeout=TIMEOUT)
        if r.status_code != 200:
            print("\n=== ERROR GEMINI TEKS ===", r.status_code, r.text[:300])
            return None
        return r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as e:
        print("\n=== ERROR REQUEST GEMINI ===", e)
        return None


def embed(daftar_teks, task_type):
    """Kembalikan matriks embedding ternormalisasi (n x dim), atau None jika gagal."""
    if not GEMINI_API_KEY:
        return None
    hasil = []
    try:
        for i in range(0, len(daftar_teks), 100):
            potong = daftar_teks[i:i + 100]
            payload = {"requests": [{
                "model": f"models/{EMB_MODEL}",
                "content": {"parts": [{"text": t}]},
                "taskType": task_type,
            } for t in potong]}
            r = requests.post(f"{BASE_URL}/{EMB_MODEL}:batchEmbedContents",
                              headers=HEADERS, json=payload, timeout=TIMEOUT)
            if r.status_code != 200:
                print("\n=== ERROR EMBEDDING ===", r.status_code, r.text[:300])
                return None
            hasil += [e["values"] for e in r.json()["embeddings"]]
        vec = np.array(hasil, dtype=np.float32)
        norm = np.linalg.norm(vec, axis=1, keepdims=True)
        norm[norm == 0] = 1
        return vec / norm
    except Exception as e:
        print("\n=== ERROR REQUEST EMBEDDING ===", e)
        return None


EMB_BATCH = int(os.getenv("EMB_BATCH", "20"))    # teks per permintaan
EMB_JEDA = float(os.getenv("EMB_JEDA", "13"))    # detik jeda antar permintaan
EMB_COBA = 4                                     # percobaan ulang saat 429


def _sidik_teks(t):
    return hashlib.md5(f"{EMB_MODEL}||{t}".encode()).hexdigest()


def _muat_cache():
    """Cache per teks: perubahan sebagian data tidak menghitung ulang semuanya."""
    if CACHE_FILE.exists():
        try:
            d = np.load(CACHE_FILE, allow_pickle=False)
            if "kunci" in d.files:
                return dict(zip(d["kunci"].tolist(), d["vec"]))
        except Exception as e:
            print("[EMB] cache tidak terbaca:", e)
    return {}


def _simpan_cache(c):
    if c:
        np.savez(CACHE_FILE, kunci=np.array(list(c.keys())),
                 vec=np.array(list(c.values()), dtype=np.float32))


def _embed_satu_batch(potong):
    payload = {"requests": [{
        "model": f"models/{EMB_MODEL}",
        "content": {"parts": [{"text": t}]},
        "taskType": "RETRIEVAL_DOCUMENT",
    } for t in potong]}
    for percobaan in range(EMB_COBA):
        try:
            r = requests.post(f"{BASE_URL}/{EMB_MODEL}:batchEmbedContents",
                              headers=HEADERS, json=payload, timeout=60)
        except Exception as e:
            print("[EMB] gagal terhubung:", e)
            return None
        if r.status_code == 200:
            return [e["values"] for e in r.json()["embeddings"]]
        if r.status_code == 429:
            if "PerDay" in r.text:
                print("[EMB] Kuota HARIAN habis. Tunggu reset (±15.00 WIB) lalu jalankan lagi.")
                return None
            tunggu = 20 * (percobaan + 1)
            print(f"[EMB] 429 kuota per menit, menunggu {tunggu} detik...")
            time.sleep(tunggu)
            continue
        print("[EMB] error", r.status_code, r.text[:200])
        return None
    return None


def muat_embedding_buku():
    """Hitung embedding sedikit demi sedikit; hasil tersimpan tiap batch."""
    teks = [f"{r.judul}. Kategori: {r.kategori}. {r.sinopsis}" for r in df_buku.itertuples()]
    kunci = [_sidik_teks(t) for t in teks]
    cache = _muat_cache()
    kurang = [i for i, k in enumerate(kunci) if k not in cache]
    print(f"[EMB] {len(teks) - len(kurang)}/{len(teks)} sudah di cache, {len(kurang)} perlu dihitung")

    for s in range(0, len(kurang), EMB_BATCH):
        idx = kurang[s:s + EMB_BATCH]
        hasil = _embed_satu_batch([teks[i] for i in idx])
        if hasil is None:
            break
        v = np.array(hasil, dtype=np.float32)
        n = np.linalg.norm(v, axis=1, keepdims=True)
        n[n == 0] = 1
        v = v / n
        for i, vi in zip(idx, v):
            cache[kunci[i]] = vi
        _simpan_cache(cache)          # progres aman walau server dimatikan
        print(f"[EMB] tersimpan {len(cache)} embedding")
        time.sleep(EMB_JEDA)

    if all(k in cache for k in kunci):
        return np.array([cache[k] for k in kunci], dtype=np.float32)
    print("[EMB] Belum lengkap, memakai TF-IDF dulu. Jalankan ulang nanti, proses akan melanjutkan.")
    return None


# Simpan embedding asli terpisah, supaya mode bisa dibolak-balik tanpa hitung ulang
EMB_ASLI = muat_embedding_buku()
EMB_SIM_ASLI = (EMB_ASLI @ EMB_ASLI.T) if EMB_ASLI is not None else None

# Variabel yang dipakai seluruh fungsi pencarian (None = mode TF-IDF saja)
EMB_BUKU = EMB_ASLI
EMB_SIM = EMB_SIM_ASLI
MODE_AKTIF = "hybrid" if EMB_ASLI is not None else "tfidf"
print("Mode rekomendasi:", "HYBRID (embedding + TF-IDF)" if MODE_AKTIF == "hybrid" else "TF-IDF saja")

# ==============================================================================
# SKOR & BANTUAN
# ==============================================================================
def gabung_skor(emb_scores, tfidf_scores):
    """Gabungkan kemiripan makna (embedding) dan kecocokan kata (TF-IDF) jadi 0..1."""
    if emb_scores is None:
        return np.clip(tfidf_scores, 0, 1)
    emb_kalibrasi = np.clip((emb_scores - EMB_LOW) / (EMB_HIGH - EMB_LOW), 0, 1)
    return np.clip(BOBOT_EMB * emb_kalibrasi + BOBOT_TFIDF * tfidf_scores, 0, 1)


def ambang(emb_ada):
    return MIN_SKOR_HYBRID if emb_ada else MIN_SKOR_TFIDF


def _int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def url_gambar(nilai):
    """Nama file di folder covers/ -> URL penuh. URL http(s) dipakai apa adanya.
    Mengembalikan "" jika kosong / file tidak ditemukan (frontend memakai sampul pengganti)."""
    nilai = str(nilai).strip()
    if not nilai:
        return ""
    if nilai.startswith(("http://", "https://")):
        return nilai
    if (COVER_DIR / nilai).is_file():
        return f"{PUBLIC_URL}/covers/{nilai}"
    return ""


def info_dasar(r):
    """Data ringkas untuk daftar / kartu buku."""
    return {
        "id_buku": int(r["id_buku"]),
        "judul": str(r["judul"]),
        "kategori": str(r["kategori"]),
        "penulis": str(r["penulis"]) or "-",
        "tahun_terbit": _int(r["tahun_terbit"]),
        "jumlah_halaman": _int(r["jumlah_halaman"]),
        "gambar": url_gambar(r["gambar"]),
    }


def detail_dict(r):
    """Data lengkap satu buku."""
    d = info_dasar(r)
    d.update({
        "sinopsis": str(r["sinopsis"]),
        "penerbit": str(r["penerbit"]) or "-",
        "jumlah_halaman": _int(r["jumlah_halaman"]),
        "isbn": str(r["isbn"]),
    })
    return d


def ke_dict(i, skor):
    d = detail_dict(df_buku.iloc[i])
    d["skor_kemiripan"] = round(float(skor), 2)
    return d


def buku_serupa(idx, n=JUMLAH_SERUPA):
    emb = EMB_SIM[idx] if EMB_SIM is not None else None
    skor = gabung_skor(emb, cosine_sim[idx]).copy()
    skor[idx] = -1
    batas = ambang(EMB_SIM is not None)
    return [ke_dict(i, skor[i]) for i in np.argsort(-skor)[:n] if skor[i] >= batas]


def nilai_hasil(konteks, hasil, saring):
    """Gemini menilai tiap kandidat: relevan atau tidak, plus 1 kalimat alasan.
    saring=True  -> buang kandidat yang dinilai tidak relevan (untuk pencarian teks)
    saring=False -> hanya menambah alasan (untuk rekomendasi dari buku acuan)
    Jika panggilan gagal, hasil dikembalikan apa adanya."""
    if not PAKAI_ALASAN_AI or not hasil:
        return hasil
    daftar = "\n".join(f'{n + 1}. {h["judul"]} - {h["sinopsis"][:300]}' for n, h in enumerate(hasil))
    prompt = f"""Pengguna mencari / menyukai: "{konteks}".

Untuk setiap buku di bawah, tentukan:
- "relevan": true HANYA jika topik utama buku berkaitan langsung dengan kebutuhan pengguna.
  Jika kemiripannya hanya kebetulan atau topiknya jauh berbeda, isi false.
- "alasan": satu kalimat singkat (maksimal 20 kata) Bahasa Indonesia yang menjelaskan hubungannya.
  Hanya gunakan informasi dari deskripsi buku.

{daftar}

Balas HANYA berupa JSON array berisi {len(hasil)} objek berformat
{{"relevan": true, "alasan": "..."}}, urut sesuai nomor buku."""
    teks = panggil_gemini(prompt, json_mode=True)
    if not teks:
        return hasil
    try:
        penilaian = json.loads(teks)
        if not (isinstance(penilaian, list) and len(penilaian) == len(hasil)):
            return hasil
        lolos = []
        for h, p in zip(hasil, penilaian):
            if not isinstance(p, dict):
                p = {"relevan": True, "alasan": str(p)}
            if p.get("alasan"):
                h["alasan"] = str(p["alasan"])
            if DEBUG_SKOR:
                print(f'[JURI] relevan={p.get("relevan")} | {h["judul"]}')
            if saring and p.get("relevan") is False:
                continue
            lolos.append(h)
        return lolos
    except Exception as e:
        print("\n=== ERROR PARSING PENILAIAN ===", e)
        return hasil


_cache_kata_kunci = {}
_cache_embed_query = {}
_cache_hasil_cari = {}   # hasil pencarian lengkap, supaya halaman "lihat semua" instan


def ekstrak_kata_kunci(teks):
    """Ubah kalimat santai jadi kata kunci topik. Hasil sukses di-cache."""
    if teks in _cache_kata_kunci:
        return _cache_kata_kunci[teks]
    prompt = f"""
    Ubah kalimat pencarian santai berikut menjadi kata kunci topik/ilmu spesifik dalam Bahasa Indonesia.
    Kalimat Pengguna: "{teks}"

    Aturan:
    1. Abaikan dan HAPUS kata-kata umum seperti "buku", "cari", "mau", "gw", "tolong", "saya".
    2. Ekstrak topik utama dan perluas dengan istilah teknis serta sinonim (contoh: "koding" -> "pemrograman coding software informatika python react").
    3. Hanya tambahkan istilah yang BENAR-BENAR berkaitan langsung dengan kalimat pengguna. Jangan menambah topik lain agar terlihat cocok.
    4. HANYA berikan kata-kata kunci hasil ekstrak dalam 1 baris tanpa tanda baca.
    """
    hasil = panggil_gemini(prompt)
    if not hasil:
        return None
    kata_kunci = hasil.splitlines()[0].strip()
    _cache_kata_kunci[teks] = kata_kunci
    return kata_kunci


def embed_query(teks):
    if teks in _cache_embed_query:
        return _cache_embed_query[teks]
    vec = embed([teks], "RETRIEVAL_QUERY")
    if vec is None:
        return None
    _cache_embed_query[teks] = vec[0]
    return vec[0]


# ==============================================================================
# 1. GET DAFTAR BUKU (opsional filter ?kategori=...&q=...)
# ==============================================================================
@app.get("/api/buku")
def get_all_buku(kategori: str | None = None, q: str | None = None):
    df = df_buku
    if kategori:
        df = df[df["kategori"].str.lower() == kategori.strip().lower()]
    if q:
        kunci = q.strip().lower()
        gabung = (df["judul"] + " " + df["penulis"] + " " + df["kategori"]).str.lower()
        df = df[gabung.str.contains(kunci, regex=False)]
    return [info_dasar(r) for _, r in df.iterrows()]


# ==============================================================================
# 1b. GET DAFTAR KATEGORI (nama, jumlah buku, beberapa sampul)
# ==============================================================================
@app.get("/api/kategori")
def get_kategori():
    hasil = []
    for nama, grup in df_buku.groupby("kategori"):
        sampul = [url_gambar(g) for g in grup["gambar"]]
        sampul = [s for s in sampul if s][:3]
        hasil.append({"nama": str(nama), "jumlah": int(len(grup)), "sampul": sampul})
    hasil.sort(key=lambda k: (-k["jumlah"], k["nama"]))
    return hasil

# ==============================================================================
# 1c. GRAF KEMIRIPAN (untuk halaman /peta)
# ==============================================================================
_cache_graf = {}


@app.get("/api/graf")
def get_graf(top: int = 5, min_skor: float = 0.1):
    """Tiap buku dihubungkan ke `top` buku termirip (skor >= min_skor).
    Frontend menyaring lagi lewat slider, jadi kirim batas serendah mungkin."""
    top = max(1, min(top, 8))
    kunci = (top, round(min_skor, 2))
    if kunci in _cache_graf:
        return _cache_graf[kunci]

    S = gabung_skor(EMB_SIM, cosine_sim).copy()
    np.fill_diagonal(S, -1)

    pasangan = {}
    for i in range(len(df_buku)):
        for rank, j in enumerate(np.argsort(-S[i])[:top]):
            if S[i, j] < min_skor and rank >= 2:
                continue
            a, b = int(min(i, j)), int(max(i, j))
            pasangan[(a, b)] = max(pasangan.get((a, b), 0.0), float(S[i, j]))

    ids = df_buku["id_buku"].astype(int).tolist()
    hasil = {
        "nodes": [info_dasar(r) for _, r in df_buku.iterrows()],
        "links": [
            {"source": ids[a], "target": ids[b], "skor": round(s, 2)}
            for (a, b), s in pasangan.items()
        ],
    }
    _cache_graf[kunci] = hasil
    return hasil

# ==============================================================================
# 1d. BUKU TERBAIK (paling "terhubung" dengan koleksi lain)
# ==============================================================================
_cache_terbaik = {}


@app.get("/api/terbaik")
def get_terbaik(n: int = 3):
    n = max(1, min(n, 12))
    if n in _cache_terbaik:
        return _cache_terbaik[n]

    S = gabung_skor(EMB_SIM, cosine_sim)
    S = np.array(S, dtype=float)
    np.fill_diagonal(S, 0)

    k = max(1, min(5, len(df_buku) - 1))
    pusat = np.sort(S, axis=1)[:, -k:].mean(axis=1)           # rata-rata 5 tetangga terdekat
    bonus = np.array([0.02 if url_gambar(g) else 0.0 for g in df_buku["gambar"]])

    urut = np.argsort(-(pusat + bonus))[:n]
    hasil = [detail_dict(df_buku.iloc[int(i)]) for i in urut]
    _cache_terbaik[n] = hasil
    return hasil

# ==============================================================================
# 2. GET DETAIL BUKU BY ID (lengkap + buku serupa)
# ==============================================================================
@app.get("/api/buku/detail/{id_buku}")
def get_detail_buku(id_buku: int):
    idx = df_buku.index[df_buku["id_buku"] == id_buku].tolist()
    if not idx:
        return {"error": "Buku tidak ditemukan"}
    idx = idx[0]
    data = detail_dict(df_buku.iloc[idx])
    data["serupa"] = buku_serupa(idx)
    return data


# ==============================================================================
# 3. GET REKOMENDASI BERDASARKAN ID BUKU ACUAN
# ==============================================================================
@app.get("/api/rekomendasi/{id_buku}")
def get_rekomendasi(id_buku: int):
    idx = df_buku.index[df_buku["id_buku"] == id_buku].tolist()
    if not idx:
        return {"error": "Buku tidak ditemukan"}
    idx = idx[0]

    emb_scores = EMB_SIM[idx] if EMB_SIM is not None else None
    skor = gabung_skor(emb_scores, cosine_sim[idx]).copy()
    skor[idx] = -1  # jangan rekomendasikan buku itu sendiri

    urutan = [i for i in np.argsort(-skor) if i != idx]
    top_idx = urutan[:JUMLAH_HASIL]
    batas = ambang(EMB_SIM is not None)
    sisa_idx = [i for i in urutan[JUMLAH_HASIL:] if skor[i] >= batas][:MAKS_TERKAIT_ACUAN]

    judul_acuan = str(df_buku.iloc[idx]["judul"])
    rekomendasi = [ke_dict(i, skor[i]) for i in top_idx]
    rekomendasi = nilai_hasil(f'buku "{judul_acuan}"', rekomendasi, saring=False)
    terkait = [ke_dict(i, skor[i]) for i in sisa_idx]

    return {
        "buku_acuan": judul_acuan,
        "rekomendasi": rekomendasi,
        "terkait_lainnya": terkait,
        "total_terkait": len(rekomendasi) + len(terkait),
    }


# ==============================================================================
# 4. GET REKOMENDASI VIA AI SEARCH (top 3 + semua yang berkaitan)
# ==============================================================================
def cari_teks(teks, kategori):
    kunci = f"{teks.lower()}||{(kategori or '').lower()}"
    if kunci in _cache_hasil_cari:
        return _cache_hasil_cari[kunci]

    # a) Perluas kata kunci dengan Gemini (jika gagal, pakai teks asli)
    kata_ai = ekstrak_kata_kunci(teks)
    kata_kunci = kata_ai or teks

    # b) Kecocokan kata (TF-IDF)
    tfidf_scores = cosine_similarity(
        tfidf.transform([f"{kata_kunci} {teks}"]), tfidf_matrix
    ).flatten()

    # c) Kemiripan makna (embedding), jika tersedia
    emb_scores = None
    if EMB_BUKU is not None:
        q_vec = embed_query(teks)
        if q_vec is not None:
            emb_scores = EMB_BUKU @ q_vec

    skor = gabung_skor(emb_scores, tfidf_scores)

    # d) Batasi ke satu kategori bila diminta
    if kategori:
        luar = (df_buku["kategori"].str.lower() != kategori.strip().lower()).to_numpy()
        skor = np.where(luar, 0.0, skor)

    batas = ambang(emb_scores is not None)

    if DEBUG_SKOR:
        print(f'\n[CARI] "{teks}" kategori={kategori} -> kata kunci: "{kata_kunci}"')
        for i in np.argsort(-skor)[:5]:
            e = f"{emb_scores[i]:.2f}" if emb_scores is not None else "-"
            print(f'  hybrid={skor[i]:.2f} emb={e} tfidf={tfidf_scores[i]:.2f} | {df_buku.iloc[i]["judul"]}')

    # Kandidat: semua buku di atas ambang (terurut skor), dibatasi jumlahnya
    kandidat = [i for i in np.argsort(-skor)[:MAKS_TERKAIT + JUMLAH_HASIL] if skor[i] >= batas]

    # Juri AI hanya menilai kandidat teratas (hemat kuota); sisanya hanya ditampilkan
    jumlah_juri = JUMLAH_HASIL + 2
    pool, sisa = kandidat[:jumlah_juri], kandidat[jumlah_juri:]
    lolos = nilai_hasil(teks, [ke_dict(i, skor[i]) for i in pool], saring=True)

    top = lolos[:JUMLAH_HASIL]
    # Jika juri menolak semua kandidat teratas, sisa yang skornya lebih rendah ikut dibuang
    terkait = (lolos[JUMLAH_HASIL:] + [ke_dict(i, skor[i]) for i in sisa]) if top else []

    if not top:
        return {
            "buku_acuan": f'Tidak ada buku yang cukup relevan untuk "{teks}". Coba kata kunci lain.',
            "kata_kunci": kata_kunci,
            "rekomendasi": [],
            "terkait_lainnya": [],
            "total_terkait": 0,
        }

    hasil = {
        "buku_acuan": f'Pencarian: "{teks}" (Diterjemahkan AI: "{kata_kunci}")',
        "kata_kunci": kata_kunci,
        "rekomendasi": top,
        "terkait_lainnya": terkait,
        "total_terkait": len(top) + len(terkait),
    }

    # Simpan ke cache hanya jika Gemini berhasil (jangan menyimpan hasil "darurat")
    if kata_ai is not None:
        if len(_cache_hasil_cari) > 200:
            _cache_hasil_cari.clear()
        _cache_hasil_cari[kunci] = hasil
    return hasil


@app.post("/api/rekomendasi/search")
def get_rekomendasi_by_text(query: SearchQuery):
    teks = query.teks.strip()
    if not teks:
        return {"error": "Input pencarian tidak boleh kosong"}
    return cari_teks(teks, query.kategori)

# ==============================================================================
# 5. GANTI MODE REKOMENDASI (hybrid <-> tfidf)
# ==============================================================================
from fastapi import HTTPException


class ModeBody(BaseModel):
    mode: str   # "hybrid" atau "tfidf"


@app.get("/api/mode")
def get_mode():
    return {"mode": MODE_AKTIF, "hybrid_tersedia": EMB_ASLI is not None}


@app.post("/api/mode")
def set_mode(body: ModeBody):
    global EMB_ASLI, EMB_SIM_ASLI, EMB_BUKU, EMB_SIM, MODE_AKTIF
    mode = body.mode.strip().lower()
    if mode not in ("hybrid", "tfidf"):
        raise HTTPException(400, "Mode harus 'hybrid' atau 'tfidf'")

    if mode == "hybrid":
        if EMB_ASLI is None:                      # coba muat ulang bila sebelumnya gagal
            EMB_ASLI = muat_embedding_buku()
            if EMB_ASLI is not None:
                EMB_SIM_ASLI = EMB_ASLI @ EMB_ASLI.T
        if EMB_ASLI is None:
            raise HTTPException(503, "Embedding tidak tersedia (cek API key / kuota Gemini)")
        EMB_BUKU, EMB_SIM = EMB_ASLI, EMB_SIM_ASLI
    else:
        EMB_BUKU, EMB_SIM = None, None

    MODE_AKTIF = mode
    # Hasil lama dihitung dengan mode sebelumnya, jadi cache dikosongkan
    _cache_hasil_cari.clear()
    _cache_graf.clear()
    _cache_terbaik.clear()
    print("Mode rekomendasi diubah ke:", mode.upper())
    return {"mode": MODE_AKTIF, "hybrid_tersedia": EMB_ASLI is not None}

# ==============================================================================
# AKUN MAHASISWA SEDERHANA (NPM) + DAFTAR SAYA PER AKUN
# ==============================================================================
import sqlite3
import secrets
import time
import hmac
from contextlib import contextmanager
from fastapi import Depends, Header, HTTPException

DB_FILE = Path("akun.db")
NPM_FILE = Path("npm_valid.txt")            # opsional: daftar NPM yang boleh masuk
PASSWORD_BEBAS = os.getenv("PASSWORD_BEBAS", "false").lower() == "true"
SESI_DETIK = 14 * 24 * 3600
MAKS_DAFTAR = 500
_gagal = {}                                  # npm -> (jumlah gagal, waktu pertama)


@contextmanager
def koneksi():
    con = sqlite3.connect(DB_FILE)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def _init_db():
    with koneksi() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS akun(
            npm TEXT PRIMARY KEY, nama TEXT, salt TEXT, hash TEXT, dibuat INTEGER);
        CREATE TABLE IF NOT EXISTS sesi(
            token TEXT PRIMARY KEY, npm TEXT, kedaluwarsa INTEGER);
        CREATE TABLE IF NOT EXISTS daftar(
            npm TEXT, id_buku INTEGER, urut INTEGER, PRIMARY KEY(npm, id_buku));
        """)


_init_db()


def _hash(pw, salt):
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 120_000).hex()


def _npm_diizinkan(npm):
    if not NPM_FILE.exists():
        return True
    daftar = {l.strip() for l in NPM_FILE.read_text(encoding="utf-8").splitlines() if l.strip()}
    return npm in daftar


def _cek_blokir(npm):
    c = _gagal.get(npm)
    if c and c[0] >= 5 and time.time() - c[1] < 300:
        raise HTTPException(429, "Terlalu banyak percobaan gagal. Coba lagi 5 menit lagi.")


def _catat_gagal(npm):
    c = _gagal.get(npm)
    if not c or time.time() - c[1] >= 300:
        _gagal[npm] = (1, time.time())
    else:
        _gagal[npm] = (c[0] + 1, c[1])


class MasukIn(BaseModel):
    npm: str
    password: str
    nama: str | None = None


class DaftarIn(BaseModel):
    ids: list[int]


def akun_saat_ini(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Belum masuk.")
    token = authorization[7:].strip()
    with koneksi() as con:
        r = con.execute(
            "SELECT s.npm, a.nama FROM sesi s JOIN akun a ON a.npm = s.npm "
            "WHERE s.token = ? AND s.kedaluwarsa > ?",
            (token, int(time.time())),
        ).fetchone()
    if not r:
        raise HTTPException(401, "Sesi berakhir. Silakan masuk lagi.")
    return {"npm": r["npm"], "nama": r["nama"] or "", "token": token}


def _ids_akun(con, npm):
    rows = con.execute("SELECT id_buku FROM daftar WHERE npm = ? ORDER BY urut", (npm,)).fetchall()
    return [int(r["id_buku"]) for r in rows]


@app.get("/api/auth/info")
def auth_info():
    return {"password_sama_npm": not PASSWORD_BEBAS, "npm_dibatasi": NPM_FILE.exists()}


@app.post("/api/auth/masuk")
def auth_masuk(d: MasukIn):
    npm = d.npm.strip()
    pw = d.password
    nama = (d.nama or "").strip()[:30]

    if not re.fullmatch(r"\d{6,15}", npm):
        raise HTTPException(400, "NPM harus berupa angka 6 sampai 15 digit.")
    if not pw or len(pw) > 64:
        raise HTTPException(400, "Password belum diisi.")
    _cek_blokir(npm)
    if not PASSWORD_BEBAS and pw != npm:
        _catat_gagal(npm)
        raise HTTPException(401, "Password mahasiswa sama dengan NPM.")
    if not _npm_diizinkan(npm):
        raise HTTPException(403, "NPM ini belum terdaftar di perpustakaan.")

    sekarang = int(time.time())
    with koneksi() as con:
        a = con.execute("SELECT * FROM akun WHERE npm = ?", (npm,)).fetchone()
        baru = a is None
        if baru:
            salt = secrets.token_hex(16)
            con.execute("INSERT INTO akun VALUES (?,?,?,?,?)", (npm, nama, salt, _hash(pw, salt), sekarang))
            nama_akhir = nama
        else:
            if not hmac.compare_digest(_hash(pw, a["salt"]), a["hash"]):
                _catat_gagal(npm)
                raise HTTPException(401, "Password salah.")
            if nama and nama != a["nama"]:
                con.execute("UPDATE akun SET nama = ? WHERE npm = ?", (nama, npm))
            nama_akhir = nama or a["nama"] or ""

        con.execute("DELETE FROM sesi WHERE kedaluwarsa < ?", (sekarang,))
        token = secrets.token_urlsafe(32)
        con.execute("INSERT INTO sesi VALUES (?,?,?)", (token, npm, sekarang + SESI_DETIK))
        ids = _ids_akun(con, npm)

    _gagal.pop(npm, None)
    return {"token": token, "npm": npm, "nama": nama_akhir, "baru": baru, "ids": ids}


@app.get("/api/auth/saya")
def auth_saya(akun=Depends(akun_saat_ini)):
    return {"npm": akun["npm"], "nama": akun["nama"]}


@app.post("/api/auth/keluar")
def auth_keluar(akun=Depends(akun_saat_ini)):
    with koneksi() as con:
        con.execute("DELETE FROM sesi WHERE token = ?", (akun["token"],))
    return {"ok": True}


@app.get("/api/daftar-saya")
def ambil_daftar(akun=Depends(akun_saat_ini)):
    with koneksi() as con:
        return {"ids": _ids_akun(con, akun["npm"])}


@app.put("/api/daftar-saya")
def simpan_daftar(d: DaftarIn, akun=Depends(akun_saat_ini)):
    valid = set(df_buku["id_buku"].astype(int).tolist())
    bersih = []
    for i in d.ids:
        if i in valid and i not in bersih:
            bersih.append(i)
    bersih = bersih[:MAKS_DAFTAR]
    with koneksi() as con:
        con.execute("DELETE FROM daftar WHERE npm = ?", (akun["npm"],))
        con.executemany(
            "INSERT INTO daftar VALUES (?,?,?)",
            [(akun["npm"], i, n) for n, i in enumerate(bersih)],
        )
    return {"ids": bersih}

# ==============================================================================
# FITUR 1-3: STATUS BACA, CATATAN, REKOMENDASI DARI DAFTAR SAYA
# ==============================================================================
STATUS_VALID = {"ingin", "sedang", "selesai"}
MAKS_CATATAN = 2000


def _init_db_koleksi():
    with koneksi() as con:
        con.executescript("""
        CREATE TABLE IF NOT EXISTS status_baca(
            npm TEXT, id_buku INTEGER, status TEXT, diubah INTEGER,
            PRIMARY KEY(npm, id_buku));
        CREATE TABLE IF NOT EXISTS catatan(
            npm TEXT, id_buku INTEGER, teks TEXT, diubah INTEGER,
            PRIMARY KEY(npm, id_buku));
        """)


_init_db_koleksi()


class StatusIn(BaseModel):
    status: str


class CatatanIn(BaseModel):
    teks: str


class DariDaftarIn(BaseModel):
    ids: list[int]
    n: int = 6


def _id_valid(id_buku: int) -> bool:
    return bool((df_buku["id_buku"].astype(int) == id_buku).any())


@app.get("/api/saya/status")
def saya_status(akun=Depends(akun_saat_ini)):
    with koneksi() as con:
        rows = con.execute(
            "SELECT id_buku, status FROM status_baca WHERE npm = ?", (akun["npm"],)
        ).fetchall()
    return {"status": {str(r["id_buku"]): r["status"] for r in rows}}


@app.put("/api/saya/status/{id_buku}")
def saya_set_status(id_buku: int, d: StatusIn, akun=Depends(akun_saat_ini)):
    s = d.status.strip()
    if s and s not in STATUS_VALID:
        raise HTTPException(400, "Status tidak dikenal.")
    if not _id_valid(id_buku):
        raise HTTPException(404, "Buku tidak ditemukan.")
    with koneksi() as con:
        if s:
            con.execute(
                "INSERT OR REPLACE INTO status_baca VALUES (?,?,?,?)",
                (akun["npm"], id_buku, s, int(time.time())),
            )
        else:
            con.execute(
                "DELETE FROM status_baca WHERE npm = ? AND id_buku = ?", (akun["npm"], id_buku)
            )
    return {"ok": True}


@app.get("/api/saya/catatan")
def saya_catatan(akun=Depends(akun_saat_ini)):
    with koneksi() as con:
        rows = con.execute(
            "SELECT id_buku, teks FROM catatan WHERE npm = ?", (akun["npm"],)
        ).fetchall()
    return {"catatan": {str(r["id_buku"]): r["teks"] for r in rows}}


@app.put("/api/saya/catatan/{id_buku}")
def saya_set_catatan(id_buku: int, d: CatatanIn, akun=Depends(akun_saat_ini)):
    teks = d.teks.strip()[:MAKS_CATATAN]
    if not _id_valid(id_buku):
        raise HTTPException(404, "Buku tidak ditemukan.")
    with koneksi() as con:
        if teks:
            con.execute(
                "INSERT OR REPLACE INTO catatan VALUES (?,?,?,?)",
                (akun["npm"], id_buku, teks, int(time.time())),
            )
        else:
            con.execute(
                "DELETE FROM catatan WHERE npm = ? AND id_buku = ?", (akun["npm"], id_buku)
            )
    return {"ok": True}


@app.post("/api/rekomendasi/dari-daftar")
def rekomendasi_dari_daftar(d: DariDaftarIn):
    """Rekomendasi dari kumpulan buku di daftar saya (tamu maupun akun)."""
    n = max(1, min(d.n, 12))
    id_df = df_buku["id_buku"].astype(int).to_numpy()
    posisi = {int(v): i for i, v in enumerate(id_df)}
    pilih = [posisi[i] for i in dict.fromkeys(d.ids[:200]) if i in posisi]
    if not pilih:
        return []

    S = np.array(gabung_skor(EMB_SIM, cosine_sim), dtype=float)
    sub = S[pilih]                                   # (jumlah dipilih, semua buku)
    skor = 0.5 * sub.mean(axis=0) + 0.5 * sub.max(axis=0)
    skor[pilih] = -1                                 # jangan sarankan yang sudah disimpan
    batas = ambang(EMB_SIM is not None)

    hasil = []
    for j in np.argsort(-skor):
        if len(hasil) >= n or skor[j] < batas:
            break
        asal = pilih[int(np.argmax(sub[:, j]))]
        h = ke_dict(int(j), skor[j])
        h["alasan"] = f'Mirip dengan “{df_buku.iloc[asal]["judul"]}” di daftarmu'
        hasil.append(h)
    return hasil


# ==============================================================================
# FITUR 4: ADMIN (kunci rahasia, bukan akun mahasiswa)
# ==============================================================================
import base64
import shutil
import threading

ADMIN_KEY = os.getenv("ADMIN_KEY", "")
CSV_FILE = Path("buku.csv")
_kunci_csv = threading.Lock()
_perlu_terapkan = {"v": False}
KOLOM_ADMIN = ["id_buku", "judul", "kategori", "penulis", "tahun_terbit",
               "jumlah_halaman", "penerbit", "isbn", "gambar", "sinopsis"]


def admin_saja(x_admin_key: str | None = Header(default=None)):
    if not ADMIN_KEY:
        raise HTTPException(503, "Admin nonaktif. Isi ADMIN_KEY di file .env lalu restart server.")
    _cek_blokir("admin")
    if not x_admin_key or not hmac.compare_digest(x_admin_key.encode(), ADMIN_KEY.encode()):
        _catat_gagal("admin")
        raise HTTPException(401, "Kunci admin salah.")
    _gagal.pop("admin", None)
    return True


class BukuIn(BaseModel):
    judul: str
    kategori: str = ""
    penulis: str = ""
    tahun_terbit: str = ""
    jumlah_halaman: str = ""
    penerbit: str = ""
    isbn: str = ""
    gambar: str = ""
    sinopsis: str = ""


class CoverIn(BaseModel):
    ekstensi: str
    data: str


def _baca_mentah():
    df = pd.read_csv(CSV_FILE, dtype=str, on_bad_lines="skip",
                     engine="python", encoding="utf-8-sig").fillna("")
    for k in KOLOM_ADMIN:
        if k not in df.columns:
            df[k] = ""
    return df


def _tulis_mentah(df):
    if CSV_FILE.exists():
        shutil.copy(CSV_FILE, CSV_FILE.with_name("buku_backup_admin.csv"))
    df.to_csv(CSV_FILE, index=False, encoding="utf-8-sig")
    _perlu_terapkan["v"] = True


def _kol_desk(df):
    return next((c for c in df.columns if c.lower().startswith("desk")), None)


def _bersih(d: BukuIn):
    angka = lambda s, m: re.sub(r"\D", "", s)[:m]
    gambar = d.gambar.strip()[:300]
    if gambar and not gambar.startswith(("http://", "https://")):
        gambar = os.path.basename(gambar)
    judul = d.judul.strip()[:250]
    if not judul:
        raise HTTPException(400, "Judul wajib diisi.")
    return {
        "judul": judul,
        "kategori": d.kategori.strip()[:60],
        "penulis": d.penulis.strip()[:200],
        "tahun_terbit": angka(d.tahun_terbit, 4),
        "jumlah_halaman": angka(d.jumlah_halaman, 5),
        "penerbit": d.penerbit.strip()[:150],
        "isbn": d.isbn.strip()[:40],
        "gambar": gambar,
        "sinopsis": d.sinopsis.strip()[:6000],
    }


def _siapkan_df(mentah):
    """Sama dengan langkah persiapan data di bagian atas file ini."""
    df = mentah.copy()
    for kol in KOLOM_TEKS:
        if kol not in df.columns:
            df[kol] = ""
    df = df.fillna("")
    for kol in KOLOM_TEKS:
        df[kol] = df[kol].astype(str).str.strip()
    kd = _kol_desk(df)
    if kd:
        kosong = df["sinopsis"].astype(str).str.strip() == ""
        df.loc[kosong, "sinopsis"] = df.loc[kosong, kd].astype(str)
    df["id_buku"] = pd.to_numeric(df["id_buku"], errors="coerce")
    df = df[df["id_buku"].notna()].copy()
    df["id_buku"] = df["id_buku"].astype(int)
    kat = df["kategori"].astype(str).str.strip().replace("", "Tanpa Kategori")
    kanon = kat.groupby(kat.str.lower()).agg(lambda s: s.value_counts().index[0])
    df["kategori"] = kat.str.lower().map(kanon)
    df["fitur_teks"] = (
        (df["judul"].astype(str) + " ") * 3
        + (df["kategori"].astype(str) + " ") * 2
        + df["sinopsis"].astype(str)
    )
    return df.reset_index(drop=True)


def _hitung_emb_untuk(df):
    """Seperti muat_embedding_buku, tapi untuk df tertentu (hanya teks baru yang dihitung)."""
    teks = [f"{r.judul}. Kategori: {r.kategori}. {r.sinopsis}" for r in df.itertuples()]
    kunci = [_sidik_teks(t) for t in teks]
    cache = _muat_cache()
    kurang = [i for i, k in enumerate(kunci) if k not in cache]
    for s in range(0, len(kurang), EMB_BATCH):
        idx = kurang[s:s + EMB_BATCH]
        hasil = _embed_satu_batch([teks[i] for i in idx])
        if hasil is None:
            break
        v = np.array(hasil, dtype=np.float32)
        nrm = np.linalg.norm(v, axis=1, keepdims=True)
        nrm[nrm == 0] = 1
        v = v / nrm
        for i, vi in zip(idx, v):
            cache[kunci[i]] = vi
        _simpan_cache(cache)
        if s + EMB_BATCH < len(kurang):
            time.sleep(EMB_JEDA)
    if all(k in cache for k in kunci):
        return np.array([cache[k] for k in kunci], dtype=np.float32)
    return None


@app.get("/api/admin/cek")
def admin_cek(_adm=Depends(admin_saja)):
    return {"ok": True}


@app.get("/api/admin/status")
def admin_status(_adm=Depends(admin_saja)):
    return {
        "perlu_terapkan": _perlu_terapkan["v"],
        "total": int(len(df_buku)),
        "mode": "hybrid" if EMB_BUKU is not None else "tfidf",
    }


@app.get("/api/admin/buku")
def admin_daftar(_adm=Depends(admin_saja)):
    with _kunci_csv:
        df = _baca_mentah()
    kd = _kol_desk(df)
    out = []
    for _i, r in df.iterrows():
        row = {k: str(r[k]) for k in KOLOM_ADMIN}
        if not row["sinopsis"] and kd:
            row["sinopsis"] = str(r[kd])
        row["gambar_url"] = url_gambar(r["gambar"])
        out.append(row)
    kategori = sorted({r["kategori"] for r in out if r["kategori"]})
    return {"buku": out, "kategori": kategori}


@app.post("/api/admin/buku")
def admin_tambah(d: BukuIn, _adm=Depends(admin_saja)):
    isi = _bersih(d)
    with _kunci_csv:
        df = _baca_mentah()
        ids = pd.to_numeric(df["id_buku"], errors="coerce").dropna()
        baru = int(ids.max()) + 1 if len(ids) else 1
        row = {k: "" for k in df.columns}
        row.update(isi)
        row["id_buku"] = str(baru)
        df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)
        _tulis_mentah(df)
    return {"id_buku": baru, "perlu_terapkan": True}


@app.put("/api/admin/buku/{id_buku}")
def admin_ubah(id_buku: int, d: BukuIn, _adm=Depends(admin_saja)):
    isi = _bersih(d)
    with _kunci_csv:
        df = _baca_mentah()
        m = df["id_buku"] == str(id_buku)
        if not m.any():
            raise HTTPException(404, "Buku tidak ditemukan.")
        for k, v in isi.items():
            df.loc[m, k] = v
        _tulis_mentah(df)
    return {"ok": True, "perlu_terapkan": True}


@app.delete("/api/admin/buku/{id_buku}")
def admin_hapus(id_buku: int, _adm=Depends(admin_saja)):
    with _kunci_csv:
        df = _baca_mentah()
        m = df["id_buku"] == str(id_buku)
        if not m.any():
            raise HTTPException(404, "Buku tidak ditemukan.")
        _tulis_mentah(df[~m])
    with koneksi() as con:
        for tabel in ("daftar", "status_baca", "catatan"):
            con.execute(f"DELETE FROM {tabel} WHERE id_buku = ?", (id_buku,))
    return {"ok": True, "perlu_terapkan": True}


@app.post("/api/admin/cover/{id_buku}")
def admin_cover(id_buku: int, d: CoverIn, _adm=Depends(admin_saja)):
    ext = d.ekstensi.lower().lstrip(".")
    if ext == "jpeg":
        ext = "jpg"
    if ext not in {"jpg", "png", "webp"}:
        raise HTTPException(400, "Format harus JPG, PNG, atau WEBP.")
    try:
        raw = base64.b64decode(d.data, validate=True)
    except Exception:
        raise HTTPException(400, "Data gambar tidak valid.")
    if len(raw) > 2_000_000:
        raise HTTPException(413, "Ukuran gambar maksimal 2 MB.")
    sah = (
        (ext == "jpg" and raw[:3] == b"\xff\xd8\xff")
        or (ext == "png" and raw[:8] == b"\x89PNG\r\n\x1a\n")
        or (ext == "webp" and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP")
    )
    if not sah:
        raise HTTPException(400, "Isi file tidak sesuai dengan ekstensinya.")

    nama = f"{id_buku}.{ext}"
    (COVER_DIR / nama).write_bytes(raw)
    with _kunci_csv:
        df = _baca_mentah()
        m = df["id_buku"] == str(id_buku)
        if not m.any():
            raise HTTPException(404, "Buku tidak ditemukan.")
        df.loc[m, "gambar"] = nama
        _tulis_mentah(df)
    return {"gambar": nama}


@app.post("/api/admin/terapkan")
def admin_terapkan(_adm=Depends(admin_saja)):
    """Membaca ulang buku.csv dan membangun ulang TF-IDF + embedding tanpa restart."""
    global df_buku, tfidf, tfidf_matrix, cosine_sim, EMB_BUKU, EMB_SIM
    with _kunci_csv:
        mentah = pd.read_csv(CSV_FILE, on_bad_lines="skip", engine="python", encoding="utf-8-sig")
        df_baru = _siapkan_df(mentah)
        if df_baru.empty:
            raise HTTPException(400, "Tidak ada buku yang valid di buku.csv.")
        tf_baru = TfidfVectorizer(tokenizer=tokenize, lowercase=False, token_pattern=None,
                                  ngram_range=(1, 2), sublinear_tf=True)
        mat_baru = tf_baru.fit_transform(df_baru["fitur_teks"])
        cos_baru = cosine_similarity(mat_baru, mat_baru)
        emb_baru = _hitung_emb_untuk(df_baru)
        sim_baru = (emb_baru @ emb_baru.T) if emb_baru is not None else None

        # semua diganti sekaligus agar tidak ada keadaan setengah jadi
        df_buku, tfidf, tfidf_matrix, cosine_sim = df_baru, tf_baru, mat_baru, cos_baru
        EMB_BUKU, EMB_SIM = emb_baru, sim_baru

        _cache_graf.clear()
        _cache_terbaik.clear()
        _cache_hasil_cari.clear()
        _perlu_terapkan["v"] = False

    return {
        "total": int(len(df_buku)),
        "mode": "hybrid" if EMB_BUKU is not None else "tfidf",
    }