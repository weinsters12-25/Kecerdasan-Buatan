"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogIn, LogOut, Search } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import BrandLogo from "./BrandLogo";
import { useAkun, useDaftarSaya } from "../lib/useDaftarSaya";

const NAV = [
  ["/", "Beranda"],
  ["/katalog", "Katalog"],
  ["/peta", "Peta"],
];

export default function SiteHeader() {
  const path = usePathname();
  const { ids } = useDaftarSaya();
  const { user, keluar } = useAkun();
  const aktif = (p) => (p === "/" ? path === "/" : path.startsWith(p));
  const nama = user ? user.nama || user.npm : "";

  return (
    <header className="topbar">
      <BrandLogo />

      <div className="topbar-right">
        <nav className="nav" aria-label="Navigasi utama">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} aria-current={aktif(href) ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="cmd-btn"
          onClick={() => window.dispatchEvent(new Event("buka-palet"))}
          aria-label="Buka pencarian cepat"
        >
          <Search size={16} />
          <span>Cari…</span>
          <kbd className="kbd">Ctrl K</kbd>
        </button>

        <Link
          href="/daftar-saya"
          className="icon-chip saved"
          aria-label={`Daftar saya, ${ids.length} buku`}
          aria-current={aktif("/daftar-saya") ? "page" : undefined}
        >
          <Heart size={18} />
          {ids.length > 0 && <b>{ids.length}</b>}
        </Link>

        {user ? (
          <div className="acc">
            <Link href="/daftar-saya" className="acc-who" title={`NPM ${user.npm}`}>
              <i>{nama.charAt(0).toUpperCase()}</i>
              <span>{nama}</span>
            </Link>
            <button type="button" className="acc-out" onClick={keluar} aria-label="Keluar dari akun" title="Keluar">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <Link href="/masuk" className="acc-in" aria-current={aktif("/masuk") ? "page" : undefined}>
            <LogIn size={16} />
            <span>Masuk</span>
          </Link>
        )}

        <ThemeToggle />
      </div>
    </header>
  );
}