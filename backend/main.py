from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import requests

# API Key
GEMINI_API_KEY = "AQ.Ab8RN6KKv3MdjS6uWvW4MCcT9FUyPkBphRxQG0ydyheFVI0NQQ"

class SearchQuery(BaseModel):
    teks: str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load & olah dataset
df_buku = pd.read_csv("buku.csv")
df_buku['fitur_teks'] = (
    df_buku['judul'].fillna('') + " " + 
    df_buku['kategori'].fillna('') + " " + 
    df_buku['deskripsi'].fillna('')
)

tfidf = TfidfVectorizer(lowercase=True)
tfidf_matrix = tfidf.fit_transform(df_buku['fitur_teks'])
cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)

# ==============================================================================
# 1. GET ALL BUKU
# ==============================================================================
@app.get("/api/buku")
def get_all_buku():
    daftar = []
    for _, row in df_buku.iterrows():
        daftar.append({
            "id_buku": int(row['id_buku']),
            "judul": str(row['judul']),
            "kategori": str(row['kategori'])
        })
    return daftar

# ==============================================================================
# 2. GET DETAIL BUKU BY ID (Baru)
# ==============================================================================
@app.get("/api/buku/detail/{id_buku}")
def get_detail_buku(id_buku: int):
    row = df_buku[df_buku['id_buku'] == id_buku]
    if row.empty:
        return {"error": "Buku tidak ditemukan"}
    
    buku = row.iloc[0]
    return {
        "id_buku": int(buku['id_buku']),
        "judul": str(buku['judul']),
        "kategori": str(buku['kategori']),
        "deskripsi": str(buku['deskripsi']),
        "penulis": str(buku.get('penulis', '-')),
        "tahun_terbit": int(buku.get('tahun_terbit', 0)),
        "jumlah_halaman": int(buku.get('jumlah_halaman', 0)),
        "penerbit": str(buku.get('penerbit', '-'))
    }

# ==============================================================================
# 3. GET REKOMENDASI BERDASARKAN ID BUKU ACUAN
# ==============================================================================
@app.get("/api/rekomendasi/{id_buku}")
def get_rekomendasi(id_buku: int):
    idx = df_buku.index[df_buku['id_buku'] == id_buku].tolist()
    if not idx:
        return {"error": "Buku tidak ditemukan"}
    
    idx = idx[0]
    sim_scores = list(enumerate(cosine_sim[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    sim_scores = sim_scores[1:4]
    
    rekomendasi = []
    for i, score in sim_scores:
        rekomendasi.append({
            "id_buku": int(df_buku.iloc[i]['id_buku']),
            "judul": str(df_buku.iloc[i]['judul']),
            "kategori": str(df_buku.iloc[i]['kategori']),
            "deskripsi": str(df_buku.iloc[i]['deskripsi']),
            "penulis": str(df_buku.iloc[i].get('penulis', '-')),
            "tahun_terbit": int(df_buku.iloc[i].get('tahun_terbit', 0)),
            "jumlah_halaman": int(df_buku.iloc[i].get('jumlah_halaman', 0)),
            "penerbit": str(df_buku.iloc[i].get('penerbit', '-')),
            "skor_kemiripan": round(float(score), 2)
        })
        
    return {
        "buku_acuan": df_buku.iloc[idx]['judul'],
        "rekomendasi": rekomendasi
    }

# ==============================================================================
# 4. GET REKOMENDASI VIA AI SEARCH
# ==============================================================================
@app.post("/api/rekomendasi/search")
def get_rekomendasi_by_text(query: SearchQuery):
    if not query.teks.strip():
        return {"error": "Input pencarian tidak boleh kosong"}

    prompt = f"""
    Ubah kalimat pencarian santai berikut menjadi kata kunci topik/ilmu spesifik dalam Bahasa Indonesia.
    Kalimat Pengguna: "{query.teks}"

    Aturan:
    1. Abaikan dan HAPUS kata-kata umum seperti "buku", "cari", "mau", "gw", "tolong", "saya".
    2. Ekstrak topik utama dan perluas dengan istilah teknis (contoh: "koding" -> "pemrograman coding software informatika python react").
    3. HANYA berikan kata-kata kunci hasil ekstrak dalam 1 baris tanpa tanda baca.
    """
    
    try:
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
        
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY
        }
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        
        response = requests.post(url, headers=headers, json=payload)
        res_json = response.json()
        
        if response.status_code == 200:
            kata_kunci_baku = res_json['candidates'][0]['content']['parts'][0]['text'].strip()
        else:
            print("\n=== DETAIL ERROR API ===", res_json)
            kata_kunci_baku = query.teks
            
    except Exception as e:
        print("\n=== DETAIL ERROR REQUEST ===", e)
        kata_kunci_baku = query.teks

    user_vector = tfidf.transform([kata_kunci_baku])
    similarity_scores = cosine_similarity(user_vector, tfidf_matrix).flatten()
    
    df_copy = df_buku.copy()
    df_copy['skor_kemiripan'] = similarity_scores
    
    top_rekomendasi = df_copy.sort_values(by='skor_kemiripan', ascending=False).head(3)
    
    rekomendasi = []
    for _, row in top_rekomendasi.iterrows():
        rekomendasi.append({
            "id_buku": int(row['id_buku']),
            "judul": str(row['judul']),
            "kategori": str(row['kategori']),
            "deskripsi": str(row['deskripsi']),
            "penulis": str(row.get('penulis', '-')),
            "tahun_terbit": int(row.get('tahun_terbit', 0)),
            "jumlah_halaman": int(row.get('jumlah_halaman', 0)),
            "penerbit": str(row.get('penerbit', '-')),
            "skor_kemiripan": round(float(row['skor_kemiripan']), 2)
        })
        
    return {
        "buku_acuan": f'Pencarian: "{query.teks}" (Diterjemahkan AI: "{kata_kunci_baku}")',
        "rekomendasi": rekomendasi
    }