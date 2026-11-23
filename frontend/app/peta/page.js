"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "../components/PageShell";
import PetaKemiripan from "../components/PetaKemiripan";
import { getGraf } from "../lib/api";

function PetaIsi() {
  const sp = useSearchParams();
  const fokus = sp.get("fokus") || "";
  const [state, setState] = useState({ data: null, error: "" });

  useEffect(() => {
    let batal = false;
    getGraf()
      .then((d) => !batal && setState({ data: d, error: "" }))
      .catch(
        () =>
          !batal &&
          setState({
            data: null,
            error: "Gagal memuat peta. Pastikan backend sudah diperbarui dan Uvicorn berjalan.",
          })
      );
    return () => {
      batal = true;
    };
  }, []);

  return (
    <>
      <section className="page-head">
        <h1>Peta kemiripan</h1>
        <p className="lead">
          Lihat bagaimana buku-buku saling berkaitan. Jarak dan garis dihitung dari kemiripan
          isi menggunakan embedding dan TF-IDF, sama seperti mesin rekomendasi.
        </p>
      </section>

      <section className="results" style={{ paddingTop: 0 }}>
        {state.error && <div className="empty">{state.error}</div>}
        {!state.error && !state.data && <div className="skeleton" style={{ height: 480 }} />}
        {state.data && <PetaKemiripan data={state.data} fokus={fokus} />}
      </section>
    </>
  );
}

export default function PetaPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="empty">Memuat…</div>}>
        <PetaIsi />
      </Suspense>
    </PageShell>
  );
}