# 📚 Sistem Rekomendasi Buku & Referensi Jurnal Perpustakaan Kampus

Proyek ini merupakan prototipe aplikasi antarmuka web cerdas berbasis **Artificial Intelligence (AI)** yang dirancang untuk membantu mahasiswa menemukan rekomendasi buku perpustakaan atau referensi jurnal kampus yang paling sesuai. Aplikasi ini mendukung dua metode pencarian: melalui pilihan daftar buku (*dropdown*) maupun input pencarian berbasis teks bebas (*free-text search*) yang mampu memahami berbagai variasi gaya penulisan pengguna (bahasa santai, gaul, typo, hingga kalimat berbelit-belit).

---

## 1. Pendekatan & Arsitektur AI (Hybrid Model)

Sistem ini menerapkan pendekatan **Hybrid Content-Based Filtering** yang menggabungkan kemampuan pemahaman bahasa alami dari model **LLM (Large Language Model)** serta kalkulasi skor statistik vektor.

### 🤖 Komponen Utama AI:

1. **LLM Semantic Parser (Google Gemini API - `gemini-2.5-flash`):**
   * Bertindak sebagai *Semantic Intent & Keyword Extractor*.
   * Berfungsi menerjemahkan segala gaya penulisan pengguna (bahasa tidak baku, singkatan, gaul, atau typo) menjadi kata kunci baku dan relevan (maksimal 5 kata kunci utama).
   * *Contoh:* Input pengguna `"gw pengen belajar ngoding python dong bro buat pemula"` diproses oleh Gemini menjadi `"pemrograman python dasar koding pemula"`.

2. **NLP & TF-IDF (Text Frequency - Inverse Document Frequency):**
   * Digunakan untuk mengekstraksi fitur teks (`fitur_teks`) yang merupakan gabungan dari kolom `judul`, `kategori`, dan `deskripsi` pada koleksi buku.
   * Mengonversi kata kunci baku hasil ekstraksi Gemini menjadi bentuk representasi vektor angka statistik.

3. **Cosine Similarity:**
   * Algoritma matematika untuk menghitung tingkat kemiripan sudut antar-vektor angka kata kunci pencarian terhadap seluruh vektor dokumen di dataset `buku.csv`.
   * Menghasilkan rentang skor kemiripan dari **0.0 (tidak mirip)** hingga **1.0 (sangat identik / 100% match)**.

---

## 2. Cara Kerja Algoritma (Dual-Mode Recommendation)
1. **Mode Pencarian Bebas (Teks / Bahasa Gaul):**
   * Pengguna memasukkan teks bebas pada kolom pencarian antarmuka Next.js.
   * Teks dikirim via request `POST` ke backend FastAPI.
   * **Gemini API** mengekstrak konteks dan menerjemahkan kalimat menjadi kata kunci baku.
   * Kata kunci baku dihitung bobot angkanya oleh **TF-IDF Vectorizer** dan diukur derajat kesamaannya menggunakan **Cosine Similarity**.
   * Backend mengembalikan Top 3 rekomendasi buku lengkap dengan label terjemahan AI dan skor kemiripan (*Match %*).

2. **Mode Berdasarkan ID Buku (Dropdown):**
   * Pengguna memilih salah satu judul buku dari daftar *dropdown*.
   * Backend mengambil matriks TF-IDF buku acuan tersebut dan menghitung nilai kesamaan vektor terhadap seluruh buku lain di database.

---

## 3. Struktur Data (`buku.csv`)

File referensi data disimpan pada lokasi `backend/buku.csv` dengan skema kolom sebagai berikut:

| Nama Kolom | Tipe Data | Keterangan / Deskripsi |
| :--- | :--- | :--- |
| `id_buku` | Integer | Penanda unik / Primary Key tiap buku. |
| `judul` | Text | Judul lengkap buku perpustakaan. |
| `kategori` | Text | Kelompok topik/jurusan (misal: Informatika, Akuntansi, Manajemen, Ekonomi). |
| `deskripsi` | Text | Ringkasan isi buku dan *keywords* yang diolah oleh AI untuk mengukur kemiripan. |

---

## 4. Pustaka & Modul yang Digunakan (Tech Stack)

### Back-End (Python):
* **`fastapi`**: Framework web REST API modern dan berkinerja tinggi.
* **`uvicorn`**: Server ASGI lokal untuk menjalankan aplikasi FastAPI.
* **`pandas`**: Pustaka manipulasi dan analisis data tabel CSV.
* **`scikit-learn`**:
  * `TfidfVectorizer`: Mengubah teks deskripsi menjadi matriks angka statistik.
  * `cosine_similarity`: Menghitung skor kemiripan antardokumen.
* **`google-generativeai`**: SDK resmi Google Gemini AI untuk interpretasi teks berbasis LLM.
* **`pydantic`**: Validasi skema tipe data JSON pada API.
* **`fastapi.middleware.cors`**: Pengatur izin Cross-Origin Resource Sharing (CORS) dari antarmuka web.

### Front-End (Next.js / React):
* **`Next.js`**: React Framework untuk penataan halaman dan antarmuka web.
* **`lucide-react`**: Ikonografi modern untuk elemen visual UI.
* **`framer-motion`**: Pustaka animasi antarmuka pengguna.

---

## 5. Konfigurasi API Key (Google Gemini)

Untuk mengaktifkan fitur penerjemah gaya bahasa berbasis LLM:

1. Dapatkan API Key gratis di [Google AI Studio](https://aistudio.google.com/api-keys).
2. Buka file `backend/main.py`.
3. Tempelkan API Key kamu pada variabel berikut di baris awal kode:
   ```python
   GEMINI_API_KEY = "PASTE_API_KEY_GEMINI_KAMU_DI_SINI"

## 6. Langkah jalankan server uvicorn dari folder backend
1. ketik di cmd "uvicorn main:app --reload"
2. Server akan aktif di alamat lokal: http://127.0.0.1:8000.

## 7. Install Next.js di folder frontend
1. ketik di cmd "npx create-next-app@latest"
2. pastikan server uvicorn sedang aktif ketika ingin run "npm run dev"