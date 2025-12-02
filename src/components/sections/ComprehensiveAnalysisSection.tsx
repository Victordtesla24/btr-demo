'use client';

import React, { useEffect, useRef, useState } from 'react';
import NebulaAnimation from '@/components/animations/NebulaAnimation';

/**
 * Comprehensive Analysis Section Component
 * 
 * SUGGESTED ANIMATION OPTIONS (Choose 1):
 * 
 * Option 1: GALAXY SPIRAL ANIMATION
 * - Rotating spiral galaxy with luminous arms
 * - Thousands of star particles following spiral pattern
 * - Bright galactic core with dimmer outer regions
 * - Logarithmic spiral mathematics (phi-based)
 * - Perfect for: Analysis, insight, comprehensive view, big picture
 * 
 * Option 2: NEBULA CLOUD ANIMATION
 * - Flowing, morphing nebula with particle clouds
 * - Color gradients in monochrome (white to gray)
 * - Organic, fluid motion using Perlin noise
 * - Stars forming within the nebula
 * - Perfect for: Creation, formation, emergence of patterns
 * 
 * Option 3: BLACK HOLE ACCRETION DISK
 * - Central black hole with orbiting accretion disk
 * - Matter spiraling inward with increasing speed
 * - Gravitational lensing light bending effects
 * - Event horizon boundary visualization
 * - Perfect for: Deep analysis, gravity of information, convergence
 */

interface ComprehensiveAnalysisSectionProps {
  className?: string;
}

const ComprehensiveAnalysisSection: React.FC<ComprehensiveAnalysisSectionProps> = ({ 
  className = '' 
}) => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [nebulaActive, setNebulaActive] = useState(false);

  // Only run the heavy WebGL nebula when this section is in view on
  // larger screens and motion is not reduced.
  useEffect(() => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) return;

    if (typeof window === 'undefined') return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const prefersReducedMotion = motionQuery.matches;
    const isSmallViewport = window.innerWidth < 768;

    if (prefersReducedMotion || isSmallViewport) {
      setNebulaActive(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === sectionEl) {
            const visibleEnough = entry.isIntersecting && entry.intersectionRatio > 0.3;
            setNebulaActive(visibleEnough);
          }
        });
      },
      {
        threshold: [0, 0.3, 0.6],
      }
    );

    observer.observe(sectionEl);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="comprehensive-analysis"
      className={`relative min-h-screen flex items-center justify-center bg-black ${className}`}
    >
      {/* Nebula volumetric background (extended beyond section bounds for seamless blending) */}
      <div
        className="pointer-events-none absolute inset-x-0 overflow-hidden"
        style={{ top: '-20vh', bottom: '-20vh' }}
        aria-hidden="true"
      >
        <NebulaAnimation isActive={nebulaActive} />
        {/* Soft top fade so the nebula blends into the surrounding black background */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black via-black/80 to-transparent" />
        {/* Soft bottom fade so the nebula disappears smoothly into the next section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/85 to-transparent" />
      </div>

      {/* Content Container with Two-Column Layout */}
      <div className="relative z-10 container mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 items-center justify-between">
          {/* Left Side: layout spacer; nebula is rendered as full-section background */}
          <div className="hidden lg:block flex-1 min-h-[500px]" aria-hidden="true" />

          {/* Right Side: Content */}
          <div className="flex-1 flex items-center justify-center w-full lg:w-auto">
            <div className="max-w-2xl text-center lg:text-left">
              <h2 className="text-5xl md:text-7xl font-light text-white mb-8 tracking-wider">
                COMPREHENSIVE ANALYSIS
              </h2>
              <p className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed">
                Deep-dive Jyotish interpretations, timelines, and remedial guidance delivered with cinematic clarity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComprehensiveAnalysisSection;
