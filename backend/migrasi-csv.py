import shutil
import pandas as pd

shutil.copy("buku.csv", "buku_backup.csv")

df = pd.read_csv("buku.csv").fillna("")
if "sinopsis" not in df.columns:
    df["sinopsis"] = ""

if "deskripsi" in df.columns:
    kosong = df["sinopsis"].astype(str).str.strip() == ""
    df.loc[kosong, "sinopsis"] = df.loc[kosong, "deskripsi"]
    df = df.drop(columns=["deskripsi"])

df.to_csv("buku.csv", index=False, encoding="utf-8-sig")
print("Selesai. Kolom:", list(df.columns))