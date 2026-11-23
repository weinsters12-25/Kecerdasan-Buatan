"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [tema, setTema] = useState("dark");

  useEffect(() => {
    setTema(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const ganti = (e) => {
    const baru = tema === "dark" ? "light" : "dark";
    const terapkan = () => {
      document.documentElement.dataset.theme = baru;
      try {
        localStorage.setItem("tema", baru);
      } catch {}
      setTema(baru);
    };

    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || kurangiGerak) {
      terapkan();
      return;
    }

    // Lingkaran meluas dari pusat tombol
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const vt = document.startViewTransition(() => flushSync(terapkan));
    vt.ready.then(() =>
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 650,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    );
  };

  return (
    <button
      type="button"
      className="icon-chip"
      onClick={ganti}
      aria-label={tema === "dark" ? "Ganti ke tema terang" : "Ganti ke tema gelap"}
      title="Ganti tema"
    >
      {tema === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}