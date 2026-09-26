# Dokumentasi Proyek: Sistem Rekomendasi Buku & Referensi Jurnal Perpustakaan Kampus

Proyek ini merupakan prototipe aplikasi cerdas berbasis Artificial Intelligence (AI) yang dirancang untuk membantu mahasiswa menemukan rekomendasi buku perpustakaan atau referensi jurnal kampus yang paling sesuai dengan topik yang sedang dibaca.

---

## 1. Pendekatan AI yang Digunakan

Proyek ini menerapkan pendekatan **Content-Based Filtering** (berbasis kemiripan konten) dengan memanfaatkan teknik pemrosesan teks.

### Teknik Pendukung & Rencana Pengembangan:

* **NLP (Natural Language Processing):**
  Digunakan sebagai teknik pendukung dalam pemrosesan bahasa alami. NLP bertugas melakukan pembersihan dan ekstraksi fitur teks (*text feature extraction*) pada data `kategori` dan `deskripsi` buku menggunakan metode TF-IDF, sehingga teks deskripsi yang berupa bahasa manusia dapat dikonversi menjadi representasi vektor angka yang dipahami oleh komputer.

* **Collaborative Filtering (Pengembangan Mendatang):**
  Merupakan rencana pengembangan sistem ke depan dengan memanfaatkan data riwayat peminjaman mahasiswa (`peminjaman.csv`). Melalui pendekatan *User-Based Collaborative Filtering*, sistem dapat memberikan rekomendasi buku berdasarkan pola peminjaman dari mahasiswa lain yang memiliki kemiripan minat atau riwayat bacaan.

### Cara Kerja Algoritma:
1. **Penggabungan Teks:** Sistem menggabungkan informasi teks dari `kategori` dan `deskripsi` buku menjadi satu kesatuan fitur teks (`fitur_teks`).
2. **TF-IDF (Text Frequency - Inverse Document Frequency):** Algoritma menghitung dan memberi bobot angka pada setiap kata. Kata-kata yang unik dan spesifik mendapat bobot lebih tinggi dibanding kata-kata umum.
3. **Cosine Similarity:** Menghitung derajat kesamaan sudut antar-vektor angka buku. Hasil perhitungan bernilai **0.0 (tidak mirip sama sekali)** hingga **1.0 (sangat identik)**.
4. **Ranking:** Sistem mengurutkan buku dengan nilai *Cosine Similarity* terbesar dan menyajikan 3 rekomendasi teratas kepada pengguna.

---

## 2. Struktur Data (`buku.csv`)

Data referensi buku disimpan dalam file `backend/buku.csv` dengan struktur kolom sebagai berikut:

| Nama Kolom | Tipe Data | Keterangan / Deskripsi |
| :--- | :--- | :--- |
| `id_buku` | Integer | ID unik / penanda untuk setiap buku (Primary Key). |
| `judul` | Text | Judul lengkap buku perpustakaan. |
| `kategori` | Text | Kelompok jurusan/topik umum buku (contoh: Informatika, Akuntansi). |
| `deskripsi` | Text | Ringkasan isi buku yang diolah oleh AI untuk mengukur kemiripan. |

---

## 3. Pustaka (Library) & Modul Python

Pengembangan Back-End menggunakan beberapa modul Python utama:

* **`fastapi`**: Framework web modern dan cepat untuk membuat REST API.
* **`uvicorn`**: Server ASGI lokal untuk menjalankan aplikasi FastAPI.
* **`pandas`**: Pustaka manipulasi data untuk membaca file CSV ke dalam bentuk DataFrame.
* **`scikit-learn`**:
  * `TfidfVectorizer`: Mengubah kumpulan teks deskripsi menjadi matriks angka statistik.
  * `cosine_similarity`: Menghitung nilai kemiripan vektor antar-buku.
* **`fastapi.middleware.cors (CORSMiddleware)`**: Pengatur izin keamanan agar aplikasi Front-End (Next.js) yang berjalan di port lain diizinkan meminta data ke Back-End Python.

---

## 4. Langkah Penginstalan & Jalur Eksekusi

### A. Persiapan Environment
1. Buka Terminal/Command Prompt di dalam folder `backend`.
2. Jalankan perintah untuk menginstal pustaka yang dibutuhkan:
   ```bash
   pip install fastapi uvicorn pandas scikit-learn

## 5. Langkah jalankan server uvicorn dari folder backend
1. ketik di cmd "uvicorn main:app --reload"
2. Server akan aktif di alamat lokal: http://127.0.0.1:8000.

## 6. Install Next.js di folder frontend
1. ketik di cmd "npx create-next-app@latest"
2. pastikan server uvicorn sedang aktif ketika ingin run "npm run dev"