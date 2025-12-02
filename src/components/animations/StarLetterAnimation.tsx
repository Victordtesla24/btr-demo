import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface StarLetterAnimationProps {
  letter: string;
  position?: 'left' | 'right';
  isHovered?: boolean;
  path?: string;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

interface Point {
  x: number;
  y: number;
}

/**
 * StarLetterAnimation Component
 * EXACTLY matching Chris Cole's star-to-letter animation on menu hover
 * Implementation Plan: "Menu Interaction: On hover, lighten the chosen menu item"
 * 
 * When hovering over menu items, background stars connect with white lines
 * to form the first letter of the menu item name in the star field
 * 
 * Pattern:
 * - ABOUT: "A" on RIGHT side (x: 0.60-0.70)
 * - BIRTH CHART: "B" on LEFT side (x: 0.02-0.12)
 * - ANALYSIS: "A" on LEFT side (x: 0.02-0.12) - using A2 coordinates
 * - BTR: "B" on RIGHT side (x: 0.60-0.70) - using B2 coordinates
 * - CONTACT: "C" on RIGHT side (x: 0.60-0.70)
 */

// Letter coordinate definitions (normalized 0-1)
// Positioned in star field areas - away from menu (right: 15% = x: 0.85) and Saturn (left: 27.3% = x: 0.273)
// Left-side letters: far left star field (x: 0.02-0.12)
// Right-side letters: center star field (x: 0.60-0.70) - repositioned to avoid menu overlap
// Updated coordinates to prevent overlap with:
//   - Saturn planet zone: x: 0.15-0.40, y: 0.25-0.55
//   - Menu zone: x: 0.80-0.95, y: 0.30-0.70
const LETTER_COORDS = {
  // Right‑side "A" (for ABOUT, etc.) repositioned to x: 0.60-0.70 to avoid menu at x: 0.80-0.95
  A: [
    { x: 0.60, y: 0.60 }, // bottom left
    { x: 0.65, y: 0.36 }, // apex
    { x: 0.70, y: 0.60 }, // bottom right
    { x: 0.62, y: 0.50 }, // crossbar left
    { x: 0.68, y: 0.50 }  // crossbar right
  ],
  // Left‑side "A" (A2) placed near the far left of the star field (safe zone)
  A2: [
    { x: 0.02, y: 0.60 }, // bottom left
    { x: 0.07, y: 0.36 }, // apex
    { x: 0.12, y: 0.60 }, // bottom right
    { x: 0.04, y: 0.50 }, // crossbar left
    { x: 0.10, y: 0.50 }  // crossbar right
  ],
  // Left‑side "B" in safe zone far left
  B: [
    { x: 0.04, y: 0.38 }, // top left vertical
    { x: 0.04, y: 0.50 }, // middle left vertical
    { x: 0.04, y: 0.62 }, // bottom left vertical
    { x: 0.10, y: 0.40 }, // top right curve
    { x: 0.10, y: 0.48 }, // upper middle right
    { x: 0.12, y: 0.54 }, // lower middle right
    { x: 0.12, y: 0.60 }  // bottom right curve
  ],
  // Right‑side "B" (B2) for BTR menu item - repositioned to x: 0.60-0.70 to avoid menu at x: 0.80-0.95
  B2: [
    { x: 0.60, y: 0.38 }, // top left vertical
    { x: 0.60, y: 0.50 }, // middle left vertical
    { x: 0.60, y: 0.62 }, // bottom left vertical
    { x: 0.66, y: 0.40 }, // top right curve
    { x: 0.66, y: 0.48 }, // upper middle right
    { x: 0.68, y: 0.54 }, // lower middle right
    { x: 0.68, y: 0.60 }  // bottom right curve
  ],
  // Right‑side "C" repositioned to x: 0.60-0.70 to avoid menu at x: 0.80-0.95
  C: [
    { x: 0.65, y: 0.40 }, // top right
    { x: 0.61, y: 0.43 }, // top curve
    { x: 0.60, y: 0.50 }, // middle left
    { x: 0.61, y: 0.57 }, // bottom curve
    { x: 0.65, y: 0.60 }  // bottom right
  ],
  // Add W for WORK
  W: [
    { x: 0.02, y: 0.38 }, // top left
    { x: 0.04, y: 0.60 }, // bottom left
    { x: 0.07, y: 0.48 }, // middle peak
    { x: 0.10, y: 0.60 }, // bottom right
    { x: 0.12, y: 0.38 }  // top right
  ],
  // Add H for HOME
  H: [
    { x: 0.60, y: 0.38 }, // top left
    { x: 0.60, y: 0.60 }, // bottom left
    { x: 0.68, y: 0.38 }, // top right
    { x: 0.68, y: 0.60 }, // bottom right
    { x: 0.60, y: 0.50 }, // mid left
    { x: 0.68, y: 0.50 }  // mid right
  ],
  // Add S for SKETCHES
  S: [
    { x: 0.68, y: 0.40 }, // top right
    { x: 0.62, y: 0.38 }, // top left
    { x: 0.60, y: 0.45 }, // top curve left
    { x: 0.65, y: 0.50 }, // middle
    { x: 0.70, y: 0.55 }, // bottom curve right
    { x: 0.68, y: 0.62 }, // bottom right
    { x: 0.62, y: 0.60 }  // bottom left
  ]
};

// Define which segments to draw for each letter
const LETTER_SEGMENTS = {
  A: [
    [0, 1],  // Bottom left to apex
    [1, 2],  // Apex to bottom right
    [3, 4]   // Crossbar
  ],
  A2: [
    [0, 1],  // Bottom left to apex
    [1, 2],  // Apex to bottom right
    [3, 4]   // Crossbar
  ],
  B: [
    [0, 1],  // Top to middle vertical line
    [1, 2],  // Middle to bottom vertical line
    [0, 3],  // Top left to top right curve
    [3, 4],  // Top right curve to middle
    [1, 4],  // Middle left to middle right
    [4, 5],  // Middle to lower curve
    [5, 6],  // Lower curve to bottom
    [2, 6]   // Bottom left to bottom right
  ],
  B2: [
    [0, 1],  // Top to middle vertical line
    [1, 2],  // Middle to bottom vertical line
    [0, 3],  // Top left to top right curve
    [3, 4],  // Top right curve to middle
    [1, 4],  // Middle left to middle right
    [4, 5],  // Middle to lower curve
    [5, 6],  // Lower curve to bottom
    [2, 6]   // Bottom left to bottom right
  ],
  C: [
    [0, 1],  // Top right to top curve
    [1, 2],  // Top curve to middle left
    [2, 3],  // Middle left to bottom curve
    [3, 4]   // Bottom curve to bottom right
  ],
  W: [
    [0, 1],  // Top left to bottom left
    [1, 2],  // Bottom left to middle peak
    [2, 3],  // Middle peak to bottom right
    [3, 4]   // Bottom right to top right
  ],
  H: [
    [0, 1],  // Left vertical
    [2, 3],  // Right vertical
    [4, 5]   // Crossbar
  ],
  S: [
    [0, 1],  // Top right to top left
    [1, 2],  // Top left to top curve
    [2, 3],  // Top curve to middle
    [3, 4],  // Middle to bottom curve
    [4, 5],  // Bottom curve to bottom right
    [5, 6]   // Bottom right to bottom left
  ]
};

const StarLetterAnimation: React.FC<StarLetterAnimationProps> = ({ 
  letter, 
  isHovered = false,
  label,
  isActive = false,
  onClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component only renders portal on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Draw letter segments function - memoized to prevent recreation
  const drawLetterSegments = useCallback((ctx: CanvasRenderingContext2D, coords: Point[], segments: number[][], progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert normalized coordinates to canvas coordinates
    const points = coords.map((coord: Point) => ({
      x: coord.x * canvas.width,
      y: coord.y * canvas.height
    }));

    // Draw star dots at each coordinate - ENHANCED visibility for star field
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.9, progress)})`; // Minimum 90% opacity for visibility
    points.forEach((point: Point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2); // Increased size from 2.5 to 3 for better visibility
      ctx.fill();
      // Add subtle glow effect for better visibility in star field
      ctx.shadowBlur = 5;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
    });

    // Draw connecting lines - ENHANCED visibility for star field
    ctx.strokeStyle = `rgba(255, 255, 255, ${Math.max(0.85, progress)})`; // Minimum 85% opacity for visibility
    ctx.lineWidth = 2; // Increased from 1.5 to 2 for better visibility
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Add subtle glow to lines
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.7)';

    segments.forEach((segment: number[], index: number) => {
      const [startIdx, endIdx] = segment;
      const segmentProgress = Math.max(0, Math.min(1, (progress - index * 0.15) / 0.3));
      
      if (segmentProgress > 0) {
        const start = points[startIdx];
        const end = points[endIdx];
        
        // Calculate intermediate point based on progress
        const currentX = start.x + (end.x - start.x) * segmentProgress;
        const currentY = start.y + (end.y - start.y) * segmentProgress;

        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        // Reset shadow after each line
        ctx.shadowBlur = 0;
      }
    });
    // Final shadow reset
    ctx.shadowBlur = 0;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size to viewport
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Animate letter function - memoized with dependencies
  const animateLetter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const coords = LETTER_COORDS[letter as keyof typeof LETTER_COORDS];
    const segments = LETTER_SEGMENTS[letter as keyof typeof LETTER_SEGMENTS];
    
    if (!coords || !segments) return;

    const duration = 400; // 400ms animation per implementation plan
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-in-out)
      const easedProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      progressRef.current = easedProgress;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw letter segments
      drawLetterSegments(ctx, coords, segments, easedProgress);

      if (progress < 1 && isAnimating) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [letter, isAnimating, drawLetterSegments]);

  // Fade out function - memoized with dependencies
  const fadeOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const duration = 200; // 200ms fade out
    const startProgress = progressRef.current;
    const startTime = performance.now();

    setIsAnimating(false);

    const fade = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const fadeProgress = startProgress * (1 - progress);

      progressRef.current = fadeProgress;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (fadeProgress > 0.01) {
        const coords = LETTER_COORDS[letter as keyof typeof LETTER_COORDS];
        const segments = LETTER_SEGMENTS[letter as keyof typeof LETTER_SEGMENTS];
        if (coords && segments) {
          drawLetterSegments(ctx, coords, segments, fadeProgress);
        }
        animationFrameRef.current = requestAnimationFrame(fade);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    animationFrameRef.current = requestAnimationFrame(fade);
  }, [letter, drawLetterSegments]);

  // useEffect for hover state changes
  useEffect(() => {
    if (isHovered) {
      // Start animation
      setIsAnimating(true);
      progressRef.current = 0;
      animateLetter();
    } else {
      // Fade out animation
      fadeOut();
    }
  }, [isHovered, letter, animateLetter, fadeOut]);

  return (
    <>
      {/* Render canvas via Portal to document.body so it's positioned relative to viewport, not parent container */}
      {isMounted && createPortal(
        <canvas
          ref={canvasRef}
          className="star-letter-canvas"
          data-letter={letter}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 50,
            display: isHovered ? 'block' : 'none',
            visibility: isHovered ? 'visible' : 'hidden',
          }}
          aria-hidden="true"
        />,
        document.body
      )}
      <button
        className={`chris-cole-nav-link ${isActive ? 'is-active' : ''}`}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        aria-label={`Navigate to ${label}`}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          textShadow: 'none',
          transform: 'none',
          boxShadow: 'none',
          filter: 'none',
          outline: 'none',
          display: 'block',
          position: 'relative',
          isolation: 'isolate'
        }}
      >
        <h1 
          className="chris-cole-nav-heading"
          style={{
            textShadow: 'none',
            transform: 'translateZ(0)',
            boxShadow: 'none',
            filter: 'none',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            isolation: 'isolate',
            contain: 'layout style paint',
            willChange: 'auto',
            opacity: 1,
            visibility: 'visible',
            position: 'relative',
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'visible',
            margin: 0,
            padding: 0,
            outline: 'none',
            border: 'none',
            background: 'transparent'
          }}
        >
          {label}
        </h1>
      </button>
    </>
  );
};

export default StarLetterAnimation;
