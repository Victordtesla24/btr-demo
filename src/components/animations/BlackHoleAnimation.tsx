'use client';

import React from 'react';

/**
 * BlackHoleAnimation
 *
 * Full-bleed background wrapper around Eric Bruneton's original WebGL2 black
 * hole shader demo, embedded via an iframe. All physics (gravitational
 * lensing, Doppler, accretion disc, etc.) come from the assets in
 * `public/black_hole/demo`.
 *
 * Props allow the parent section to control which scene variant is used
 * (galaxy field vs spacetime grid) and whether the heavy WebGL iframe should
 * be mounted at all (for performance when the section is off-screen).
 */
export type BlackHoleSceneMode = 'galaxy' | 'grid';

interface BlackHoleAnimationProps {
  /**
   * Which underlying scene to show. `galaxy` matches the original reference
   * demo background; `grid` enables the spacetime grid overlay (sg=1).
   */
  sceneMode?: BlackHoleSceneMode;
  /**
   * When false, the expensive iframe is not rendered and we show a static
   * black placeholder instead. This lets callers gate the simulation on
   * visibility (e.g. via IntersectionObserver).
   */
  isActive?: boolean;
  className?: string;
}

const BLACK_HOLE_BASE_QUERY =
  'cb=36&dd=571&do=1000&dt=274&srd=65&cy=35895&cp=9028&sfy=1137&sfp=912&sfr=1291&or=702&ce=753&hc=1';

const BlackHoleAnimation: React.FC<BlackHoleAnimationProps> = ({
  sceneMode = 'galaxy',
  isActive = true,
  className = '',
}) => {
  // When the section is off-screen we skip mounting the iframe entirely to
  // avoid burning GPU on a hidden WebGL canvas.
  if (!isActive) {
    return (
      <div
        className={`w-full h-full relative overflow-hidden bg-black ${className}`}
        aria-hidden="true"
      />
    );
  }

  const sceneQuery = sceneMode === 'grid' ? '&sg=1' : '&sg=0';
  const src = `/black_hole/demo/demo.html?${BLACK_HOLE_BASE_QUERY}${sceneQuery}`;

  return (
    <div
      className={`w-full h-full relative overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          // Subtle perspective tilt, scale and offset so the black hole sits
          // left-of-centre and canvas edges are cropped out.
          transform:
            'perspective(1800px) translateX(-14%) translateY(-4%) scale(1.45) rotateX(18deg) rotateZ(-10deg)',
          transformOrigin: '25% 55%',
        }}
      >
        <iframe
          // Use the same configuration parameters as the reference demo URL
          // so we inherit the exact camera, physics and scene setup
          // (gravitational lensing, Doppler, etc.). The sceneMode only toggles
          // the grid overlay.
          src={src}
          title="Black Hole Shader Demo"
          className="w-full h-full border-0"
          frameBorder="0"
          style={{
            display: 'block',
            border: 'none',
            outline: 'none',
            // Monochrome treatment tuned for crisp contrast while keeping
            // disc detail and lensing gradients readable.
            filter: 'grayscale(1) contrast(1.15) brightness(0.9)',
            WebkitFilter: 'grayscale(1) contrast(1.15) brightness(0.9)',
            backgroundColor: '#000',
          }}
          loading="lazy"
        />
      </div>
    </div>
  );
};

export default BlackHoleAnimation;
