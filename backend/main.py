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
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

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
GEN_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")   # model teks (sama seperti kodemu)
EMB_MODEL = os.getenv("GEMINI_EMB_MODEL", "gemini-embedding-001")  # model embedding
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
HEADERS = {"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY}
TIMEOUT = 20

JUMLAH_HASIL = 3
BOBOT_EMB = 0.65      # bobot kemiripan makna (embedding)
BOBOT_TFIDF = 0.35    # bobot kecocokan kata (TF-IDF)
EMB_LOW, EMB_HIGH = 0.60, 0.85   # kalibrasi skor embedding -> 0..1 (silakan di-tuning)
MIN_SKOR_HYBRID = 0.15           # di bawah ini dianggap tidak relevan
MIN_SKOR_TFIDF = 0.05            # batas jika embedding tidak tersedia
PAKAI_ALASAN_AI = os.getenv("ALASAN_AI", "true").lower() == "true"
DEBUG_SKOR = os.getenv("DEBUG_SKOR", "true").lower() == "true"  # cetak skor mentah ke terminal

CACHE_FILE = Path("embeddings_cache.npz")


class SearchQuery(BaseModel):
    teks: str


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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


# ==============================================================================
# LOAD DATASET + TF-IDF
# ==============================================================================
df_buku = pd.read_csv("buku.csv")

# Judul dan kategori diberi bobot lebih besar daripada deskripsi
df_buku["fitur_teks"] = (
    (df_buku["judul"].fillna("") + " ") * 3
    + (df_buku["kategori"].fillna("") + " ") * 2
    + df_buku["deskripsi"].fillna("")
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
        for i in range(0, len(daftar_teks), 100):  # batas 100 teks per request
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


def muat_embedding_buku():
    """Embedding buku dihitung sekali lalu disimpan; dihitung ulang bila CSV berubah."""
    teks = [f"{r.judul}. Kategori: {r.kategori}. {r.deskripsi}" for r in df_buku.itertuples()]
    sidik = hashlib.md5((EMB_MODEL + "||".join(teks)).encode()).hexdigest()
    if CACHE_FILE.exists():
        d = np.load(CACHE_FILE, allow_pickle=False)
        if str(d["hash"]) == sidik:
            return d["vec"]
    vec = embed(teks, "RETRIEVAL_DOCUMENT")
    if vec is not None:
        np.savez(CACHE_FILE, vec=vec, hash=np.array(sidik))
    return vec


EMB_BUKU = muat_embedding_buku()
EMB_SIM = (EMB_BUKU @ EMB_BUKU.T) if EMB_BUKU is not None else None
print("Mode rekomendasi:", "HYBRID (embedding + TF-IDF)" if EMB_BUKU is not None else "TF-IDF saja")

# ==============================================================================
# SKOR & BANTUAN
# ==============================================================================
def gabung_skor(emb_scores, tfidf_scores):
    """Gabungkan kemiripan makna (embedding) dan kecocokan kata (TF-IDF) jadi 0..1."""
    if emb_scores is None:
        return np.clip(tfidf_scores, 0, 1)
    emb_kalibrasi = np.clip((emb_scores - EMB_LOW) / (EMB_HIGH - EMB_LOW), 0, 1)
    return np.clip(BOBOT_EMB * emb_kalibrasi + BOBOT_TFIDF * tfidf_scores, 0, 1)


def _int(v):
    try:
        return int(v)
    except (TypeError, ValueError):
        return 0


def ke_dict(i, skor):
    r = df_buku.iloc[i]
    return {
        "id_buku": int(r["id_buku"]),
        "judul": str(r["judul"]),
        "kategori": str(r["kategori"]),
        "deskripsi": str(r["deskripsi"]),
        "penulis": str(r.get("penulis", "-")),
        "tahun_terbit": _int(r.get("tahun_terbit", 0)),
        "jumlah_halaman": _int(r.get("jumlah_halaman", 0)),
        "penerbit": str(r.get("penerbit", "-")),
        "skor_kemiripan": round(float(skor), 2),
    }


def nilai_hasil(konteks, hasil, saring):
    """Gemini menilai tiap kandidat: relevan atau tidak, plus 1 kalimat alasan.
    saring=True  -> buang kandidat yang dinilai tidak relevan (untuk pencarian teks)
    saring=False -> hanya menambah alasan (untuk rekomendasi dari buku acuan)
    Jika panggilan gagal, hasil dikembalikan apa adanya."""
    if not PAKAI_ALASAN_AI or not hasil:
        return hasil
    daftar = "\n".join(f'{n + 1}. {h["judul"]} - {h["deskripsi"]}' for n, h in enumerate(hasil))
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
# 1. GET ALL BUKU
# ==============================================================================
@app.get("/api/buku")
def get_all_buku():
    daftar = []
    for _, row in df_buku.iterrows():
        daftar.append({
            "id_buku": int(row["id_buku"]),
            "judul": str(row["judul"]),
            "kategori": str(row["kategori"]),
        })
    return daftar


# ==============================================================================
# 2. GET DETAIL BUKU BY ID
# ==============================================================================
@app.get("/api/buku/detail/{id_buku}")
def get_detail_buku(id_buku: int):
    row = df_buku[df_buku["id_buku"] == id_buku]
    if row.empty:
        return {"error": "Buku tidak ditemukan"}

    buku = row.iloc[0]
    return {
        "id_buku": int(buku["id_buku"]),
        "judul": str(buku["judul"]),
        "kategori": str(buku["kategori"]),
        "deskripsi": str(buku["deskripsi"]),
        "penulis": str(buku.get("penulis", "-")),
        "tahun_terbit": _int(buku.get("tahun_terbit", 0)),
        "jumlah_halaman": _int(buku.get("jumlah_halaman", 0)),
        "penerbit": str(buku.get("penerbit", "-")),
    }


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

    urutan = np.argsort(-skor)[:JUMLAH_HASIL]
    rekomendasi = [ke_dict(i, skor[i]) for i in urutan]
    judul_acuan = str(df_buku.iloc[idx]["judul"])
    rekomendasi = nilai_hasil(f'buku "{judul_acuan}"', rekomendasi, saring=False)

    return {"buku_acuan": judul_acuan, "rekomendasi": rekomendasi}


# ==============================================================================
# 4. GET REKOMENDASI VIA AI SEARCH
# ==============================================================================
@app.post("/api/rekomendasi/search")
def get_rekomendasi_by_text(query: SearchQuery):
    teks = query.teks.strip()
    if not teks:
        return {"error": "Input pencarian tidak boleh kosong"}

    # a) Perluas kata kunci dengan Gemini (jika gagal, pakai teks asli)
    kata_kunci = ekstrak_kata_kunci(teks) or teks

    # b) Kecocokan kata (TF-IDF) dari teks asli + kata kunci hasil AI
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
    batas = MIN_SKOR_HYBRID if emb_scores is not None else MIN_SKOR_TFIDF

    if DEBUG_SKOR:
        print(f'\n[CARI] "{teks}" -> kata kunci: "{kata_kunci}"')
        for i in np.argsort(-skor)[:5]:
            e = f"{emb_scores[i]:.2f}" if emb_scores is not None else "-"
            print(f'  hybrid={skor[i]:.2f} emb={e} tfidf={tfidf_scores[i]:.2f} | {df_buku.iloc[i]["judul"]}')

    # Ambil beberapa kandidat ekstra; juri AI akan menyaring yang tidak relevan
    urutan = [i for i in np.argsort(-skor)[:JUMLAH_HASIL + 2] if skor[i] >= batas]
    rekomendasi = [ke_dict(i, skor[i]) for i in urutan]
    rekomendasi = nilai_hasil(teks, rekomendasi, saring=True)[:JUMLAH_HASIL]

    if not rekomendasi:
        return {
            "buku_acuan": f'Tidak ada buku yang cukup relevan untuk "{teks}". Coba kata kunci lain.',
            "rekomendasi": [],
        }

    return {
        "buku_acuan": f'Pencarian: "{teks}" (Diterjemahkan AI: "{kata_kunci}")',
        "rekomendasi": rekomendasi,
    }