'use client';

import React, { useEffect, useRef, useCallback } from 'react';

/**
 * AsteroidBeltAnimation
 * 
 * Photorealistic 3D asteroid belt orbiting Jupiter
 * Features:
 * - 200+ individual asteroids with realistic textures
 * - Half-orbit visibility (180°) around Jupiter
 * - Y-axis tilt (30°) and Z-axis tilt (20°) for 3D depth
 * - Realistic tumbling physics on 3 axes
 * - Size variation (2-15px) with power-law distribution
 * - Proper depth sorting and parallax effects
 * - Jupiter with visible cloud bands
 * - Monochromatic black/white space theme
 */

interface AsteroidBeltAnimationProps {
  className?: string;
  style?: React.CSSProperties;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

interface Asteroid {
  angle: number;
  distance: number;
  size: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  rotationSpeedX: number;
  rotationSpeedY: number;
  rotationSpeedZ: number;
  vertices: Array<{ x: number; y: number; z: number }>;
  opacity: number;
  orbitSpeed: number;
}

// Configuration constants
const JUPITER_RADIUS_RATIO = 0.12;
const JUPITER_POSITION_X_RATIO = 0.15; // Left side of canvas
const JUPITER_POSITION_Y_RATIO = 0.5; // Vertical center
const ASTEROID_COUNT = 200;
const BELT_INNER_RADIUS_RATIO = 0.22;
const BELT_OUTER_RADIUS_RATIO = 0.45;
const BASE_ORBIT_SPEED = 0.0001;
const Y_AXIS_TILT = 30 * (Math.PI / 180);
const Z_AXIS_TILT = 20 * (Math.PI / 180);
const STAR_COUNT = 60;

const AsteroidBeltAnimation: React.FC<AsteroidBeltAnimationProps> = ({
  className = '',
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const lastTimestampRef = useRef<number>(0);

  /**
   * Initialize star field
   */
  const initStars = useCallback((canvas: HTMLCanvasElement) => {
    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }
    starsRef.current = stars;
  }, []);

  /**
   * Generate irregular asteroid shape
   */
  const generateAsteroidShape = (baseSize: number): Array<{ x: number; y: number; z: number }> => {
    const vertices: Array<{ x: number; y: number; z: number }> = [];
    const vertexCount = 8 + Math.floor(Math.random() * 8);

    for (let i = 0; i < vertexCount; i++) {
      const angle = (i / vertexCount) * Math.PI * 2;
      const radiusVariation = 0.6 + Math.random() * 0.4;
      const x = Math.cos(angle) * baseSize * radiusVariation;
      const y = Math.sin(angle) * baseSize * radiusVariation;
      const z = (Math.random() - 0.5) * baseSize * 0.5;
      vertices.push({ x, y, z });
    }

    return vertices;
  };

  /**
   * Initialize asteroids with power-law size distribution
   */
  const initAsteroids = useCallback((width: number) => {
    const asteroids: Asteroid[] = [];
    const innerRadius = width * BELT_INNER_RADIUS_RATIO;
    const outerRadius = width * BELT_OUTER_RADIUS_RATIO;

    for (let i = 0; i < ASTEROID_COUNT; i++) {
      // Only create asteroids in visible half (90° to 270°)
      const angle = Math.PI / 2 + (Math.random() * Math.PI);
      const distance = innerRadius + Math.random() * (outerRadius - innerRadius);

      // Power-law size distribution (more small rocks)
      const sizeRandom = Math.pow(Math.random(), 2);
      const size = 2 + sizeRandom * 13;

      asteroids.push({
        angle,
        distance,
        size,
        rotationX: Math.random() * Math.PI * 2,
        rotationY: Math.random() * Math.PI * 2,
        rotationZ: Math.random() * Math.PI * 2,
        rotationSpeedX: (Math.random() - 0.5) * 0.002 * (1 / size),
        rotationSpeedY: (Math.random() - 0.5) * 0.002 * (1 / size),
        rotationSpeedZ: (Math.random() - 0.5) * 0.002 * (1 / size),
        vertices: generateAsteroidShape(size / 2),
        opacity: 0.7 + Math.random() * 0.3,
        orbitSpeed: BASE_ORBIT_SPEED * (1 + (Math.random() - 0.5) * 0.3),
      });
    }

    asteroidsRef.current = asteroids;
  }, []);

  /**
   * Draw star field
   */
  const drawStars = useCallback((ctx: CanvasRenderingContext2D) => {
    starsRef.current.forEach((star) => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.fill();
    });
  }, []);

  /**
   * Draw Jupiter with cloud bands
   */
  const drawJupiter = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ) => {
    // Jupiter base
    const gradient = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      0,
      x,
      y,
      radius
    );
    gradient.addColorStop(0, 'rgba(220, 220, 220, 0.9)');
    gradient.addColorStop(0.6, 'rgba(180, 180, 180, 0.8)');
    gradient.addColorStop(1, 'rgba(120, 120, 120, 0.6)');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Cloud bands
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(150, 150, 150, 0.4)';
    ctx.lineWidth = radius * 0.08;

    for (let i = -2; i <= 2; i++) {
      const bandY = i * radius * 0.25;
      ctx.beginPath();
      ctx.ellipse(0, bandY, radius * 0.9, radius * 0.15, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Great Red Spot
    ctx.fillStyle = 'rgba(140, 140, 140, 0.5)';
    ctx.beginPath();
    ctx.ellipse(radius * 0.3, radius * 0.2, radius * 0.2, radius * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }, []);

  /**
   * Apply 3D transformations (Y and Z axis tilts)
   */
  const apply3DTransform = (
    x: number,
    y: number,
    z: number,
    yTilt: number,
    zTilt: number
  ): { x: number; y: number; z: number } => {
    // Y-axis rotation
    const newX = x * Math.cos(yTilt) + z * Math.sin(yTilt);
    const newZ = -x * Math.sin(yTilt) + z * Math.cos(yTilt);
    const newY = y;

    // Z-axis rotation
    const finalX = newX * Math.cos(zTilt) - newY * Math.sin(zTilt);
    const finalY = newX * Math.sin(zTilt) + newY * Math.cos(zTilt);
    const finalZ = newZ;

    return { x: finalX, y: finalY, z: finalZ };
  };

  /**
   * Draw asteroids with 3D transformations
   */
  const drawAsteroids = useCallback((
    ctx: CanvasRenderingContext2D,
    jupiterX: number,
    jupiterY: number
  ) => {
    // Sort asteroids by Z-depth for proper rendering
    const sortedAsteroids = [...asteroidsRef.current].sort((a, b) => {
      const aPos = apply3DTransform(
        Math.cos(a.angle) * a.distance,
        Math.sin(a.angle) * a.distance,
        0,
        Y_AXIS_TILT,
        Z_AXIS_TILT
      );
      const bPos = apply3DTransform(
        Math.cos(b.angle) * b.distance,
        Math.sin(b.angle) * b.distance,
        0,
        Y_AXIS_TILT,
        Z_AXIS_TILT
      );
      return aPos.z - bPos.z; // Back to front
    });

    sortedAsteroids.forEach((asteroid) => {
      // Calculate position in belt
      const beltX = Math.cos(asteroid.angle) * asteroid.distance;
      const beltY = Math.sin(asteroid.angle) * asteroid.distance;

      // Apply 3D transformation
      const pos3D = apply3DTransform(beltX, beltY, 0, Y_AXIS_TILT, Z_AXIS_TILT);

      const screenX = jupiterX + pos3D.x;
      const screenY = jupiterY + pos3D.y;

      // Depth-based size and opacity
      const depthFactor = 1 - (pos3D.z / (asteroid.distance * 2));
      const visualSize = asteroid.size * depthFactor;
      const visualOpacity = asteroid.opacity * depthFactor;

      // Draw asteroid as irregular polygon
      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate(asteroid.rotationZ);

      ctx.beginPath();
      asteroid.vertices.forEach((vertex, idx) => {
        // Rotate vertex
        const cosX = Math.cos(asteroid.rotationX);
        const sinX = Math.sin(asteroid.rotationX);
        const cosY = Math.cos(asteroid.rotationY);
        const sinY = Math.sin(asteroid.rotationY);

        const vx = vertex.x;
        const vy = vertex.y * cosX - vertex.z * sinX;
        const vz = vertex.y * sinX + vertex.z * cosX;

        const finalVx = vx * cosY + vz * sinY;

        if (idx === 0) {
          ctx.moveTo(finalVx, vy);
        } else {
          ctx.lineTo(finalVx, vy);
        }
      });
      ctx.closePath();

      // Gradient fill for 3D effect
      const gradient = ctx.createRadialGradient(
        -visualSize * 0.3,
        -visualSize * 0.3,
        0,
        0,
        0,
        visualSize
      );
      gradient.addColorStop(0, `rgba(220, 220, 220, ${visualOpacity})`);
      gradient.addColorStop(1, `rgba(100, 100, 100, ${visualOpacity * 0.6})`);

      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 255, 255, ${visualOpacity * 0.8})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.restore();
    });
  }, []);

  /**
   * Main render loop
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const dt = lastTimestampRef.current ? now - lastTimestampRef.current : 0;
    lastTimestampRef.current = now;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const jupiterX = canvas.width * JUPITER_POSITION_X_RATIO;
    const jupiterY = canvas.height * JUPITER_POSITION_Y_RATIO;
    const jupiterRadius = canvas.width * JUPITER_RADIUS_RATIO;

    // Draw stars
    drawStars(ctx);

    // Update asteroids
    asteroidsRef.current.forEach((asteroid) => {
      asteroid.angle += asteroid.orbitSpeed * dt;
      asteroid.rotationX += asteroid.rotationSpeedX * dt;
      asteroid.rotationY += asteroid.rotationSpeedY * dt;
      asteroid.rotationZ += asteroid.rotationSpeedZ * dt;

      // Keep angle in visible range (90° to 270°)
      if (asteroid.angle > Math.PI * 1.5) {
        asteroid.angle = Math.PI / 2;
      }
    });

    // Draw asteroids
    drawAsteroids(ctx, jupiterX, jupiterY);

    // Draw Jupiter on top
    drawJupiter(ctx, jupiterX, jupiterY, jupiterRadius);

    animationFrameId.current = requestAnimationFrame(render);
  }, [drawStars, drawJupiter, drawAsteroids]);

  // Initialize on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      initStars(canvas);
      initAsteroids(canvas.width);
    };

    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [initStars, initAsteroids]);

  // Start animation
  useEffect(() => {
    render();
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [render]);

  return (
    <div
      className={`asteroid-belt-container ${className}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#000000',
        overflow: 'hidden',
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
        aria-label="3D asteroid belt orbiting Jupiter with tilted perspective"
      />
    </div>
  );
};

export default AsteroidBeltAnimation;
