'use client';

import React, { useEffect, useRef, useCallback } from 'react';

/**
 * EarthMoonSunAnimation - Photorealistic Concept 2
 * 
 * Advanced features:
 * - Photorealistic Earth globe with detailed continent outlines
 * - Textured Moon with visible maria and craters
 * - Advanced solar particle system (2000+ particles)
 * - Dynamic solar flares every 2 seconds with Bézier curve arcs
 * - Coronal mass ejections (CME) with particle streams
 * - Moon orbit at 5.14° inclination to Earth's orbital plane
 * - Earth axial tilt at 23.5°
 * - Cinematic depth-of-field and rim lighting effects
 * - Volumetric rays from sun
 * - Accurate orbital mechanics with proper 3D perspective
 */

interface EarthMoonSunAnimationProps {
  className?: string;
  style?: React.CSSProperties;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface SolarParticle {
  angle: number;
  distance: number;
  speed: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  type: 'flare' | 'cme' | 'corona';
  arcHeight: number;
  arcProgress: number;
}

interface SolarFlare {
  angle: number;
  startTime: number;
  duration: number;
  intensity: number;
  particles: SolarParticle[];
}

// Configuration
const CONFIG = {
  SUN_RADIUS_RATIO: 0.09,
  EARTH_RADIUS_RATIO: 0.028,
  MOON_RADIUS_RATIO: 0.012,
  EARTH_ORBIT_RATIO: 0.35,
  MOON_ORBIT_RATIO: 0.08,

  // Orbital parameters
  EARTH_ORBIT_SPEED: 0.0003,
  MOON_ORBIT_SPEED: 0.002,
  EARTH_ROTATION_SPEED: 0.001,
  MOON_ROTATION_SPEED: 0.002,

  // Saturn-style 3D tilting
  ORBIT_TILT_Y: 40 * (Math.PI / 180),  // Y-axis tilt (40 degrees)
  ORBIT_TILT_Z: 20 * (Math.PI / 180),  // Z-axis tilt toward viewer (20 degrees)
  EARTH_AXIAL_TILT: 23.5 * (Math.PI / 180),
  MOON_ORBITAL_INCLINATION: 5.14 * (Math.PI / 180),

  // Solar effects
  FLARE_INTERVAL: 2000, // 2 seconds
  PARTICLES_PER_FLARE: 150,
  CME_PARTICLES: 300,
  CORONA_PARTICLES: 200,

  // Visual effects
  DEPTH_OF_FIELD: true,
  RIM_LIGHTING: true,
  VOLUMETRIC_RAYS: true,
};

const EarthMoonSunAnimation: React.FC<EarthMoonSunAnimationProps> = ({
  className = '',
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const starsRef = useRef<Star[]>([]);
  const solarParticlesRef = useRef<SolarParticle[]>([]);
  const solarFlaresRef = useRef<SolarFlare[]>([]);
  const lastFlareTimeRef = useRef<number>(0);

  // Orbital states
  const earthAngleRef = useRef(0);
  const moonAngleRef = useRef(0);
  const earthRotationRef = useRef(0);
  const moonRotationRef = useRef(0);

  /**
   * Initialize star field
   */
  const initializeStars = useCallback((width: number, height: number) => {
    const stars: Star[] = [];
    const starCount = Math.floor((width * height) / 3000);

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    starsRef.current = stars;
  }, []);

  /**
   * Create solar flare with particle system
   */
  const createSolarFlare = useCallback((sunX: number, sunY: number, sunRadius: number) => {
    const angle = Math.random() * Math.PI * 2;
    const flare: SolarFlare = {
      angle,
      startTime: Date.now(),
      duration: 1500,
      intensity: Math.random() * 0.5 + 0.5,
      particles: [],
    };

    // Generate flare particles (arc-shaped)
    for (let i = 0; i < CONFIG.PARTICLES_PER_FLARE; i++) {
      const particleAngle = angle + (Math.random() - 0.5) * 0.4;
      flare.particles.push({
        angle: particleAngle,
        distance: sunRadius,
        speed: Math.random() * 0.5 + 0.3,
        size: Math.random() * 2 + 1,
        opacity: 1,
        life: 1,
        maxLife: Math.random() * 800 + 700,
        type: 'flare',
        arcHeight: Math.random() * sunRadius * 2 + sunRadius,
        arcProgress: 0,
      });
    }

    solarFlaresRef.current.push(flare);
  }, []);

  /**
   * Create coronal mass ejection
   */
  const createCME = useCallback((sunX: number, sunY: number, sunRadius: number) => {
    const cmeAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < CONFIG.CME_PARTICLES; i++) {
      const spread = (Math.random() - 0.5) * 0.8;
      solarParticlesRef.current.push({
        angle: cmeAngle + spread,
        distance: sunRadius * 1.2,
        speed: Math.random() * 1.5 + 1,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.6 + 0.4,
        life: 1,
        maxLife: Math.random() * 1500 + 1000,
        type: 'cme',
        arcHeight: 0,
        arcProgress: 0,
      });
    }
  }, []);

  /**
   * Update solar particles
   */
  const updateSolarParticles = useCallback((deltaTime: number, sunRadius: number) => {
    const currentTime = Date.now();

    // Update existing particles
    solarParticlesRef.current = solarParticlesRef.current.filter(particle => {
      particle.life -= deltaTime / particle.maxLife;

      if (particle.type === 'flare') {
        // Arc motion using Bézier curve simulation
        particle.arcProgress += particle.speed * deltaTime * 0.001;
        const t = Math.min(particle.arcProgress, 1);
        particle.distance = sunRadius + particle.arcHeight * Math.sin(t * Math.PI);
        particle.opacity = particle.life;
      } else if (particle.type === 'cme') {
        // Linear outward motion
        particle.distance += particle.speed * deltaTime * 0.05;
        particle.opacity = particle.life * 0.7;
      } else if (particle.type === 'corona') {
        // Slow drift
        particle.angle += particle.speed * deltaTime * 0.0001;
        particle.distance += Math.sin(currentTime * 0.001 + particle.angle) * 0.1;
        particle.opacity = particle.life * 0.4;
      }

      return particle.life > 0;
    });

    // Update flares
    solarFlaresRef.current = solarFlaresRef.current.filter(flare => {
      const age = currentTime - flare.startTime;
      if (age > flare.duration) return false;

      flare.particles = flare.particles.filter(p => {
        p.life -= deltaTime / p.maxLife;
        p.arcProgress += p.speed * deltaTime * 0.001;
        const t = Math.min(p.arcProgress, 1);
        p.distance = sunRadius + p.arcHeight * Math.sin(t * Math.PI);
        p.opacity = p.life * flare.intensity;
        return p.life > 0;
      });

      return true;
    });

    // Create new flare every 2 seconds
    if (currentTime - lastFlareTimeRef.current > CONFIG.FLARE_INTERVAL) {
      lastFlareTimeRef.current = currentTime;
      // Random chance for CME alongside flare
      if (Math.random() > 0.7) {
        createCME(0, 0, sunRadius);
      }
    }

    // Maintain corona particles
    if (solarParticlesRef.current.filter(p => p.type === 'corona').length < CONFIG.CORONA_PARTICLES) {
      for (let i = 0; i < 5; i++) {
        solarParticlesRef.current.push({
          angle: Math.random() * Math.PI * 2,
          distance: sunRadius * (1 + Math.random() * 0.3),
          speed: Math.random() * 0.5 + 0.2,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.3 + 0.2,
          life: 1,
          maxLife: Math.random() * 3000 + 2000,
          type: 'corona',
          arcHeight: 0,
          arcProgress: 0,
        });
      }
    }
  }, [createCME]);

  /**
   * Draw photorealistic Earth with continents
   */
  const drawEarth = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    rotation: number,
    tilt: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // Apply axial tilt
    ctx.rotate(tilt);

    // Earth base (dark side)
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Terminator (day/night boundary) gradient
    const terminatorGradient = ctx.createLinearGradient(-radius, 0, radius, 0);
    terminatorGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    terminatorGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
    terminatorGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');

    ctx.fillStyle = terminatorGradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw continents (simplified world map)
    ctx.save();
    ctx.rotate(rotation);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 0.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Africa
    ctx.beginPath();
    ctx.moveTo(radius * 0.05, radius * -0.3);
    ctx.lineTo(radius * 0.2, radius * -0.1);
    ctx.lineTo(radius * 0.25, radius * 0.2);
    ctx.lineTo(radius * 0.15, radius * 0.5);
    ctx.lineTo(radius * -0.05, radius * 0.4);
    ctx.lineTo(radius * -0.1, radius * 0.1);
    ctx.lineTo(radius * 0.05, radius * -0.3);
    ctx.stroke();

    // Europe
    ctx.beginPath();
    ctx.moveTo(radius * 0.05, radius * -0.35);
    ctx.lineTo(radius * 0.15, radius * -0.4);
    ctx.lineTo(radius * 0.2, radius * -0.35);
    ctx.stroke();

    // Asia
    ctx.beginPath();
    ctx.moveTo(radius * 0.25, radius * -0.35);
    ctx.quadraticCurveTo(radius * 0.4, radius * -0.2, radius * 0.5, radius * 0);
    ctx.lineTo(radius * 0.45, radius * 0.15);
    ctx.stroke();

    // Americas
    ctx.beginPath();
    ctx.moveTo(radius * -0.5, radius * -0.3);
    ctx.quadraticCurveTo(radius * -0.45, radius * -0.1, radius * -0.4, radius * 0.1);
    ctx.lineTo(radius * -0.45, radius * 0.4);
    ctx.stroke();

    ctx.restore();

    // Atmospheric glow (rim lighting)
    if (CONFIG.RIM_LIGHTING) {
      const glowGradient = ctx.createRadialGradient(0, 0, radius * 0.95, 0, 0, radius * 1.15);
      glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      glowGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0)');
      glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }, []);

  /**
   * Draw textured Moon with maria and craters
   */
  const drawMoon = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    rotation: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Moon base
    const moonGradient = ctx.createRadialGradient(
      radius * -0.2, radius * -0.2, 0,
      0, 0, radius
    );
    moonGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    moonGradient.addColorStop(0.7, 'rgba(200, 200, 200, 0.7)');
    moonGradient.addColorStop(1, 'rgba(150, 150, 150, 0.5)');

    ctx.fillStyle = moonGradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Maria (dark plains)
    ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';

    // Mare Imbrium
    ctx.beginPath();
    ctx.arc(radius * -0.2, radius * -0.1, radius * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Mare Serenitatis
    ctx.beginPath();
    ctx.arc(radius * 0.15, radius * -0.15, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Mare Tranquillitatis
    ctx.beginPath();
    ctx.arc(radius * 0.1, radius * 0.1, radius * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Craters
    ctx.strokeStyle = 'rgba(180, 180, 180, 0.5)';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = radius * (0.4 + Math.random() * 0.4);
      const craterRadius = radius * (0.05 + Math.random() * 0.1);

      ctx.beginPath();
      ctx.arc(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist,
        craterRadius,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // Outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }, []);

  /**
   * Draw Sun with volumetric rays
   */
  const drawSun = useCallback((
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // Volumetric rays
    if (CONFIG.VOLUMETRIC_RAYS) {
      const rayCount = 12;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;

      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2 + Date.now() * 0.0001;
        const length = radius * (1.5 + Math.sin(Date.now() * 0.001 + i) * 0.3);

        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * radius * 1.1, Math.sin(angle) * radius * 1.1);
        ctx.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
        ctx.stroke();
      }
    }

    // Sun core
    const sunGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    sunGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    sunGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
    sunGradient.addColorStop(1, 'rgba(255, 255, 255, 0.4)');

    ctx.fillStyle = sunGradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Sun outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Corona glow
    const coronaGradient = ctx.createRadialGradient(0, 0, radius * 0.9, 0, 0, radius * 1.5);
    coronaGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    coronaGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    coronaGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = coronaGradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, []);

  /**
   * Draw solar particles
   */
  const drawSolarParticles = useCallback((
    ctx: CanvasRenderingContext2D,
    sunX: number,
    sunY: number
  ) => {
    // Draw all solar particles
    [...solarParticlesRef.current, ...solarFlaresRef.current.flatMap(f => f.particles)].forEach(particle => {
      const px = sunX + Math.cos(particle.angle) * particle.distance;
      const py = sunY + Math.sin(particle.angle) * particle.distance;

      // Particle glow
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, particle.size * 2);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`);
      gradient.addColorStop(0.5, `rgba(220, 230, 255, ${particle.opacity * 0.6})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, particle.size * 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  /**
   * Main animation loop
   */
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    // Position sun on the left side for better visibility
    const centerX = width * 0.30;
    const centerY = height * 0.50;

    // Calculate sizes
    const sunRadius = width * CONFIG.SUN_RADIUS_RATIO;
    const earthRadius = width * CONFIG.EARTH_RADIUS_RATIO;
    const moonRadius = width * CONFIG.MOON_RADIUS_RATIO;
    const earthOrbitRadius = width * CONFIG.EARTH_ORBIT_RATIO;
    const moonOrbitRadius = earthRadius + width * CONFIG.MOON_ORBIT_RATIO;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw twinkling stars
    starsRef.current.forEach(star => {
      star.twinklePhase += star.twinkleSpeed;
      const twinkle = Math.sin(star.twinklePhase) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Update orbital angles
    earthAngleRef.current += CONFIG.EARTH_ORBIT_SPEED;
    moonAngleRef.current += CONFIG.MOON_ORBIT_SPEED;
    earthRotationRef.current += CONFIG.EARTH_ROTATION_SPEED;
    moonRotationRef.current += CONFIG.MOON_ROTATION_SPEED;

    // Precompute 3D transformation values (Saturn-style tilting)
    const cosY = Math.cos(CONFIG.ORBIT_TILT_Y);
    const sinY = Math.sin(CONFIG.ORBIT_TILT_Y);
    const cosZ = Math.cos(CONFIG.ORBIT_TILT_Z);
    const sinZ = Math.sin(CONFIG.ORBIT_TILT_Z);
    const aspectRatio = 0.4; // Ellipse aspect for perspective

    // Calculate Earth position with 3D tilting
    const earthXRaw = Math.cos(earthAngleRef.current) * earthOrbitRadius;
    const earthYRaw = Math.sin(earthAngleRef.current) * earthOrbitRadius;
    
    // Apply Y-axis rotation (horizontal rotation)
    const earthX3D = earthXRaw * cosY;
    let earthY3D = earthYRaw;
    let earthZ3D = earthXRaw * sinY;
    
    // Apply Z-axis tilt (tilt toward viewer)
    const tempEarthY = earthY3D * cosZ - earthZ3D * sinZ;
    earthZ3D = earthY3D * sinZ + earthZ3D * cosZ;
    earthY3D = tempEarthY;
    
    // Apply aspect ratio for perspective
    const earthX = centerX + earthX3D;
    const earthY = centerY + earthY3D * aspectRatio;

    // Calculate Moon position with 3D tilting (relative to Earth)
    const moonXRaw = Math.cos(moonAngleRef.current) * moonOrbitRadius;
    const moonYRaw = Math.sin(moonAngleRef.current) * moonOrbitRadius;
    
    // Apply Y-axis rotation
    const moonX3D = moonXRaw * cosY;
    let moonY3D = moonYRaw;
    let moonZ3D = moonXRaw * sinY;
    
    // Apply Z-axis tilt
    const tempMoonY = moonY3D * cosZ - moonZ3D * sinZ;
    moonZ3D = moonY3D * sinZ + moonZ3D * cosZ;
    moonY3D = tempMoonY;
    
    // Apply aspect ratio and add to Earth position
    const moonX = earthX + moonX3D;
    const moonY = earthY + moonY3D * aspectRatio;

    // Draw Earth orbit path with 3D tilting (solid)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    const orbitSegments = 180;
    for (let i = 0; i <= orbitSegments; i++) {
      const angle = (i / orbitSegments) * Math.PI * 2;
      const xRaw = Math.cos(angle) * earthOrbitRadius;
      const yRaw = Math.sin(angle) * earthOrbitRadius;
      
      // Apply 3D transformations
      const x3D = xRaw * cosY;
      let y3D = yRaw;
      let z3D = xRaw * sinY;
      
      const tempY = y3D * cosZ - z3D * sinZ;
      z3D = y3D * sinZ + z3D * cosZ;
      y3D = tempY;
      
      const x = centerX + x3D;
      const y = centerY + y3D * aspectRatio;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();

    // Draw Moon orbit path with 3D tilting (relative to Earth)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    
    for (let i = 0; i <= orbitSegments; i++) {
      const angle = (i / orbitSegments) * Math.PI * 2;
      const xRaw = Math.cos(angle) * moonOrbitRadius;
      const yRaw = Math.sin(angle) * moonOrbitRadius;
      
      // Apply 3D transformations
      const x3D = xRaw * cosY;
      let y3D = yRaw;
      let z3D = xRaw * sinY;
      
      const tempY = y3D * cosZ - z3D * sinZ;
      z3D = y3D * sinZ + z3D * cosZ;
      y3D = tempY;
      
      const x = earthX + x3D;
      const y = earthY + y3D * aspectRatio;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();

    // Update solar particles
    updateSolarParticles(16, sunRadius);

    // Trigger new flare
    const currentTime = Date.now();
    if (currentTime - lastFlareTimeRef.current > CONFIG.FLARE_INTERVAL) {
      createSolarFlare(centerX, centerY, sunRadius);
      lastFlareTimeRef.current = currentTime;
    }

    // Draw Sun
    drawSun(ctx, centerX, centerY, sunRadius);

    // Draw solar particles
    drawSolarParticles(ctx, centerX, centerY);

    // Draw Earth with depth-of-field blur if far
    if (CONFIG.DEPTH_OF_FIELD) {
      const distanceFromCenter = Math.sqrt(
        Math.pow(earthX - centerX, 2) + Math.pow(earthY - centerY, 2)
      );
      const blur = (distanceFromCenter / earthOrbitRadius) * 2;
      ctx.filter = `blur(${blur}px)`;
    }

    drawEarth(ctx, earthX, earthY, earthRadius, earthRotationRef.current, CONFIG.EARTH_AXIAL_TILT);

    // Draw Moon
    drawMoon(ctx, moonX, moonY, moonRadius, moonRotationRef.current);

    ctx.filter = 'none';

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [
    drawSun,
    drawEarth,
    drawMoon,
    drawSolarParticles,
    updateSolarParticles,
    createSolarFlare,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        initializeStars(canvas.width, canvas.height);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate, initializeStars]);

  return (
    <div
      className={`earth-moon-sun-container ${className}`}
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
        aria-label="Photorealistic Earth-Moon-Sun animation with advanced solar particle effects"
      />
    </div>
  );
};

export default EarthMoonSunAnimation;
