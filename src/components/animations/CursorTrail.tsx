'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

/**
 * CursorTrail Component
 * 
 * Custom cursor that follows mouse with a smooth trailing effect.
 * This implementation keeps all the visual behavior (lag, hover/click
 * scaling) but avoids a continuous RAF + polling loop in favor of
 * event-driven GSAP tweens.
 */
export default function CursorTrail() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // Respect mobile / coarse pointer devices and reduced motion.
    if (typeof window === 'undefined') return;

    const isSmallViewport = window.innerWidth < 1024;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

    if (isSmallViewport || prefersReducedMotion || isCoarsePointer) {
      // Let CSS hide the custom cursor on these devices.
      return;
    }

    // Center the cursor element on its transform origin.
    gsap.set(cursor, { xPercent: -50, yPercent: -50 });

    const moveHandler = (e: MouseEvent) => {
      gsap.to(cursor, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.2,
        ease: 'power2.out',
      });
    };

    let isHovering = false;
    let isClicking = false;

    const updateScale = () => {
      const targetScale = isClicking ? 0.75 : isHovering ? 1.5 : 1;
      gsap.to(cursor, {
        scale: targetScale,
        duration: 0.2,
        ease: 'power2.out',
      });
    };

    const handleMouseDown = () => {
      isClicking = true;
      updateScale();
    };

    const handleMouseUp = () => {
      isClicking = false;
      updateScale();
    };

    const interactiveSelector = 'a, button, [role="button"], input, textarea, select';
    const interactiveElements = Array.from(document.querySelectorAll(interactiveSelector));

    const hoverHandlers: Array<{ el: Element; enter: () => void; leave: () => void }> = [];

    interactiveElements.forEach((el) => {
      const enter = () => {
        isHovering = true;
        updateScale();
      };
      const leave = () => {
        isHovering = false;
        updateScale();
      };
      el.addEventListener('mouseenter', enter);
      el.addEventListener('mouseleave', leave);
      hoverHandlers.push({ el, enter, leave });
    });

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      hoverHandlers.forEach(({ el, enter, leave }) => {
        el.removeEventListener('mouseenter', enter);
        el.removeEventListener('mouseleave', leave);
      });
      gsap.killTweensOf(cursor);
    };
  }, []);

  return <div ref={cursorRef} className="custom-cursor" />;
}
