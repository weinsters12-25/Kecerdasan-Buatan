"use client";

import { useRef } from "react";
import { gsap, useGSAP, bolehAnimasi } from "../lib/gsap";

export default function CountUp({ to = 0, suffix = "" }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (!bolehAnimasi()) {
        el.textContent = `${to}${suffix}`;
        return;
      }
      const o = { v: 0 };
      el.textContent = `0${suffix}`;
      gsap.to(o, {
        v: to,
        duration: 1.6,
        ease: "power3.out",
        onUpdate: () => {
          el.textContent = `${Math.round(o.v)}${suffix}`;
        },
      });
    },
    { scope: ref, dependencies: [to] }
  );

  return <span ref={ref} />;
}