'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';

/**
 * SmoothScroll Component
 * 
 * Initializes Lenis smooth scrolling library
 * Provides buttery smooth scroll experience on capable devices,
 * while falling back to native scroll on small viewports, coarse
 * pointers or when the user prefers reduced motion.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmallViewport = window.innerWidth < 1024;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

    // On mobile / coarse pointers or when motion is reduced, keep
    // native scrolling for better performance and accessibility.
    if (prefersReducedMotion || isSmallViewport || isCoarsePointer) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    let rafId: number;

    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
