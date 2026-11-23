"use client";

import { useRef } from "react";
import { gsap, useGSAP, bolehAnimasi } from "../lib/gsap";

// Anak-anaknya muncul bertahap saat masuk layar.
// deps: isi dengan data daftar (mis. [buku]) agar animasi diulang saat data berganti.
export default function Reveal({
  children,
  as: Tag = "div",
  y = 32,
  stagger = 0.07,
  deps = [],
  ...rest
}) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !el.children.length || !bolehAnimasi()) return;
      gsap.from(el.children, {
        autoAlpha: 0,
        y,
        duration: 0.7,
        ease: "power3.out",
        stagger,
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    },
    { scope: ref, dependencies: deps, revertOnUpdate: true }
  );

  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  );
}