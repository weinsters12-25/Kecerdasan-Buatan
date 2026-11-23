import { gsap, useGSAP, bisaHover, bolehAnimasi } from "./gsap";

// Memiringkan elemen secara 3D mengikuti posisi kursor.
export default function useTilt(ref, max = 8) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !bisaHover() || !bolehAnimasi()) return;

      const rx = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power3.out" });
      const ry = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power3.out" });

      const masuk = () => gsap.set(el, { transformPerspective: 800 });
      const gerak = (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        ry(px * max * 2);
        rx(-py * max * 2);
      };
      const keluar = () => {
        rx(0);
        ry(0);
      };

      el.addEventListener("mouseenter", masuk);
      el.addEventListener("mousemove", gerak);
      el.addEventListener("mouseleave", keluar);
      return () => {
        el.removeEventListener("mouseenter", masuk);
        el.removeEventListener("mousemove", gerak);
        el.removeEventListener("mouseleave", keluar);
      };
    },
    { scope: ref }
  );
}