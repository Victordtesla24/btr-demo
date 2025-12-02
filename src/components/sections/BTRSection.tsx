'use client';

import React, { useEffect, useRef, useState } from 'react';
import BlackHoleAnimation, {
  type BlackHoleSceneMode,
} from '../animations/BlackHoleAnimation';
import BirthChartForm from '../ui/BirthChartForm';

interface BTRSectionProps {
  className?: string;
}

const BTRSection: React.FC<BTRSectionProps> = ({ className = '' }) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [sceneMode, setSceneMode] = useState<BlackHoleSceneMode>('galaxy');

  // Only keep the heavy WebGL iframe mounted while this section is meaningfully
  // in view. On browsers without IntersectionObserver we gracefully fall back
  // to always-on.
  useEffect(() => {
    const node = sectionRef.current;

    if (!node || typeof window === 'undefined') {
      setIsActive(true);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setIsActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === node) {
            const ratio = entry.intersectionRatio ?? 0;
            setIsActive(entry.isIntersecting && ratio > 0.2);
          }
        });
      },
      {
        threshold: [0, 0.2, 0.6],
      }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      id="birth-time-rectification"
      ref={sectionRef}
      className={`relative min-h-screen bg-black ${className}`}
    >
      {/* Background layer: full-bleed black hole animation sits behind all content and softly bleeds beyond section bounds */}
      <div
        className="pointer-events-none absolute inset-x-0 z-0 overflow-hidden"
        style={{ top: '-20vh', bottom: '-20vh' }}
        aria-hidden="true"
      >
        <BlackHoleAnimation sceneMode={sceneMode} isActive={isActive} />
        {/* Soft top fade so the black hole blends into the surrounding black background */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black via-black/80 to-transparent" />
        {/* Soft bottom fade so the black hole disappears smoothly into the next section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/85 to-transparent" />
      </div>

      {/* Scene toggle: small pill in the top-left that lets users switch between
          the original galaxy background and the spacetime grid overlay. */}
      <div className="absolute left-6 top-6 z-20 flex items-center gap-2 text-[11px] md:text-xs lg:text-sm">
        <span className="text-gray-400">Scene</span>
        <div className="inline-flex rounded-full border border-white/20 bg-black/50 backdrop-blur-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setSceneMode('galaxy')}
            className={`px-3 py-1 transition-colors ${
              sceneMode === 'galaxy'
                ? 'bg-white/15 text-white'
                : 'text-gray-400 hover:bg-white/10'
            }`}
          >
            Galaxy
          </button>
          <button
            type="button"
            onClick={() => setSceneMode('grid')}
            className={`px-3 py-1 border-l border-white/10 transition-colors ${
              sceneMode === 'grid'
                ? 'bg-white/15 text-white'
                : 'text-gray-400 hover:bg-white/10'
            }`}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Foreground content: BTR overlay sits on the right and uses the same
          glassmorphism theme as the BirthChartForm, without fully blocking the
          black hole animation behind it. */}
      <div className="relative z-10 w-full">
        <div className="container mx-auto px-6 flex min-h-screen items-center justify-end py-24">
          <div className="w-full max-w-xl ml-auto text-left">
            <div className="mb-8 max-w-md">
              <h2 className="text-3xl md:text-4xl font-semibold tracking-wide text-white mb-4">
                Birth Time Rectification
              </h2>
              <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                Refine your recorded birth time with a monochrome, glassmorphism
                interface that complements the black hole physics simulation.
                The form floats above the animation so the spacetime warping
                remains visible at all times.
              </p>
            </div>

            {/* Reuse BirthChartForm for the BTR input UI. Its internal
                glassmorphism card is semi-transparent so the animation remains
                visible beneath the overlay. */}
            <BirthChartForm />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div
            className="w-px h-16 bg-gradient-to-b from-transparent via-white to-transparent opacity-30"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          />
        </div>
      </div>
    </section>
  );
};

export default BTRSection;
