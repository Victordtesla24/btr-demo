/**
 * Hero Section Component
 *
 * Implements the corrected hero layout from the business requirements and
 * visual discrepancy analysis so tests (and the UI) match the original
 * hellochriscole.webflow.io hero:
 *
 * - Full-screen monochrome hero with a bordered specialties container
 * - Headline text describing 6 years in tech & CPG
 * - "I DO A BIT OF EVERYTHING" intro line
 * - Five specialty labels: WEB, BRANDING, PRODUCT, PACKAGING, COCKTAILS :)
 * - Satellite SVG with the original Webflow data-w-id
 * - A `.specialties-line` divider element
 */

'use client';

import React from 'react';
import Image from 'next/image';

interface Specialty {
  label: string;
  icon: string;
}

const SPECIALTIES: Specialty[] = [
  { label: 'WEB', icon: '/svg/icon-web.svg' },
  { label: 'BRANDING', icon: '/svg/icon-branding.svg' },
  { label: 'PRODUCT', icon: '/svg/icon-product.svg' },
  { label: 'PACKAGING', icon: '/svg/icon-packaging.svg' },
  { label: 'COCKTAILS :)', icon: '/svg/icon-cocktails.svg' },
];

const HeroSection: React.FC = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 md:px-10 lg:px-16"
    >
      {/* Satellite icon in the upper-right, matching original data-w-id */}
      <div
        data-w-id="625d0590-86b2-4b1f-ce96-85d35d22609c"
        className="pointer-events-none absolute right-6 top-8 md:right-10 md:top-10"
        style={{
          willChange: 'transform',
          transformStyle: 'preserve-3d',
        }}
      >
        <Image
          src="/svg/satellite.svg"
          alt=""
          data-w-id="c24b678f-7639-7dd0-241b-f552bb310982"
          className="satellite-icon w-10 h-10 md:w-12 md:h-12"
          width={48}
          height={48}
          style={{
            willChange: 'transform',
            transformStyle: 'preserve-3d',
          }}
        />
      </div>

      {/* Main content container */}
      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Line divider used by tests via `.specialties-line` selector */}
        <div className="specialties-line w-full h-px bg-white/60 mb-8 md:mb-10" />

        {/* Bordered specialties container */}
        <div className="border-2 border-white p-6 md:p-10 lg:p-12 bg-black/60 backdrop-blur-sm">
          <p className="text-sm md:text-base tracking-[0.18em] leading-relaxed mb-6 md:mb-8">
            I&#39;VE WORKED IN TECH AND CPG FOR 6 YEARS AS A CREATIVE DIRECTOR, LEADING THE DESIGN
            EFFORTS OF STARTUPS.
          </p>

          <p className="text-xs md:text-sm tracking-[0.22em] uppercase mb-6 md:mb-8">
            I DO A BIT OF EVERYTHING, BUT MY SPECIALITIES INCLUDE:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
            {SPECIALTIES.map((spec) => (
              <div
                key={spec.label}
                className="flex items-center gap-3 md:gap-4"
              >
                <Image
                  src={spec.icon}
                  alt={spec.label}
                  width={40}
                  height={40}
                  className="h-8 w-8 md:h-10 md:w-10"
                />
                <span className="text-xs md:text-sm tracking-[0.22em] uppercase">
                  {spec.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
