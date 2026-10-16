"use client";

import * as React from "react";

interface ParallaxContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function ParallaxContainer({
  children,
  className = "",
}: ParallaxContainerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rafId = React.useRef<number | null>(null);

  React.useEffect(() => {
    // Check coarse pointer or reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;

    if (prefersReducedMotion || !isFinePointer) {
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        // Calculate pointer offset from center (-1 to 1)
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = (e.clientX - centerX) / (window.innerWidth / 2);
        const dy = (e.clientY - centerY) / (window.innerHeight / 2);

        // Clamp to [-1, 1] and shift opposite pointer up to 6px
        const clampedX = Math.max(-1, Math.min(1, dx));
        const clampedY = Math.max(-1, Math.min(1, dy));
        const shiftX = (clampedX * -6).toFixed(2);
        const shiftY = (clampedY * -6).toFixed(2);

        containerRef.current.style.transform = `translate3d(${shiftX}px, ${shiftY}px, 0)`;
      });
    };

    const handlePointerLeave = () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
      if (containerRef.current) {
        containerRef.current.style.transform = "translate3d(0, 0, 0)";
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  );
}
