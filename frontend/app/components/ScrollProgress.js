"use client";

import { useRef } from "react";
import { gsap, useGSAP, bolehAnimasi } from "../lib/gsap";

export default function ScrollProgress() {
  const ref = useRef(null);

  useGSAP(
    () => {
      if (!bolehAnimasi()) return;
      gsap.fromTo(
        ref.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
        }
      );
    },
    { scope: ref }
  );

  return <div ref={ref} className="progress" aria-hidden="true" />;
}