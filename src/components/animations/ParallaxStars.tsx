'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

/**
 * ParallaxStars Component
 * 
 * Background starfield with parallax scroll effect
 * 
 * Requirements:
 * - Stars visible (1-3px white dots)
 * - ~50-100 stars per viewport
 * - Random positioning
 * - Twinkling animation (opacity 1 → 0.3 → 1, 2-4s duration)
 * - Parallax effect: Stars move at 0.3x scroll speed
 * - Fixed position (doesn't scroll with content)
 * - Z-index: 0 (behind content)
 * - Pointer-events: none (doesn't block interactions)
 * - Smooth parallax (no jank, 60fps)
 * - ScrollTrigger registered correctly
 */
export default function ParallaxStars() {
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Generate stars
    const starCount = Math.floor(window.innerWidth / 20); // ~50-100 stars per viewport
    const stars: HTMLDivElement[] = [];

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      const size = Math.random() * 2 + 1; // 1-3px
      const x = Math.random() * 100;
      const y = Math.random() * 100;

      star.style.position = 'absolute';
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.backgroundColor = 'white';
      star.style.borderRadius = '50%';
      star.style.left = `${x}%`;
      star.style.top = `${y}%`;
      star.style.opacity = '1';

      container.appendChild(star);
      stars.push(star);
      starsRef.current.push(star);

      // Twinkling animation
      if (!prefersReducedMotion) {
        gsap.to(star, {
          opacity: 0.3,
          duration: Math.random() * 2 + 2, // 2-4s duration
          repeat: -1,
          yoyo: true,
          ease: 'power1.inOut',
          delay: Math.random() * 2,
        });
      }
    }

    // Parallax scroll effect - works across entire document
    let scrollTriggerInstance: ScrollTrigger | undefined;
    if (!prefersReducedMotion) {
      scrollTriggerInstance = ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        onUpdate: () => {
          const scrollY = window.scrollY || window.pageYOffset;
          stars.forEach((star, index) => {
            const speed = 0.3 + (index % 3) * 0.1; // Varying speeds: 0.3x, 0.4x, 0.5x
            const offset = scrollY * speed;
            gsap.set(star, {
              y: offset,
            });
          });
        },
      });
    }

    return () => {
      stars.forEach((star) => {
        if (star.parentNode) {
          star.parentNode.removeChild(star);
        }
      });
      starsRef.current = [];
      if (scrollTriggerInstance) {
        scrollTriggerInstance.kill();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ willChange: 'transform' }}
    />
  );
}
