"use client";

import Link from "next/link";

const KATA = ["Pustaka", "Pintar"];

export default function BrandLogo() {
  let n = 0; // nomor huruf, dipakai untuk jeda animasi bertingkat

  return (
    <Link href="/" className="bl" aria-label="Pustaka Pintar, ke beranda">
      <span className="bl-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40">
          <rect className="bl-b b1" x="8" y="15" width="6" height="17" rx="2" />
          <rect className="bl-b b2" x="17" y="8" width="6" height="24" rx="2" />
          <rect className="bl-b b3" x="26" y="18" width="6" height="14" rx="2" />
          <path className="bl-base" d="M6 35.5h28" />
          <path
            className="bl-star"
            d="M32 3 33.6 6.8 37.4 8.4 33.6 10 32 13.8 30.4 10 26.6 8.4 30.4 6.8Z"
          />
        </svg>
      </span>

      <span className="bl-text" aria-hidden="true">
        {KATA.map((k, w) => (
          <span key={k} className={`bl-w w${w}`}>
            {[...k].map((c, i) => (
              <i key={i} style={{ "--i": n++ }}>
                {c}
              </i>
            ))}
          </span>
        ))}
      </span>
    </Link>
  );
}