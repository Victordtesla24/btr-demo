'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * CometAnimation
 *
 * Consolidated 3D comet animation used across the site (About + Contact).
 *
 * Visual goals based on the provided reference render:
 * - Rocky, faceted nucleus with intense monochrome glow
 * - Very long, high-density curved tail following an elliptical orbit
 * - Strict black & white / grayscale palette
 * - Subtle camera/parallax motion for depth, but not distracting from content
 */

export interface CometAnimationProps {
  className?: string;
}

const CometAnimation: React.FC<CometAnimationProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // In non-browser / test environments (e.g. Jest + JSDOM) there is no
    // WebGL context available. We short-circuit in that case so tests can
    // render sections without Three.js throwing.
    if (
      typeof window === 'undefined' ||
      (typeof process !== 'undefined' && 
       process.env && 
       'JEST_WORKER_ID' in process.env)
    ) {
      return;
    }

    const testCanvas = document.createElement('canvas');
    const hasWebGL = !!(
      testCanvas.getContext('webgl2') || testCanvas.getContext('webgl')
    );
    if (!hasWebGL) {
      return;
    }

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const PARTICLE_COUNT = prefersReducedMotion ? 20000 : 70000;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    // Pull the camera slightly back and above so the full elliptical arc
    // of the tail is visible, echoing the reference render composition.
    camera.position.set(0, 12, 110);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.0;

    container.appendChild(renderer.domElement);

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (!clientWidth || !clientHeight) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    };

    resize();
    window.addEventListener('resize', resize);

    // Lighting – strong key light plus subtle ambient for nucleus detail.
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(30, 40, 60);
    scene.add(keyLight);

    // Comet group (nucleus + halo + tail)
    const cometGroup = new THREE.Group();
    scene.add(cometGroup);

    // Faint orbit guide ellipse matching the comet path. This helps visually
    // suggest the long, curved trajectory from the reference image.
    const orbitPoints: THREE.Vector3[] = [];
    const ORBIT_SEGMENTS = 180;
    const ORBIT_RADIUS_X = 55;
    const ORBIT_RADIUS_Z = 25;
    for (let i = 0; i <= ORBIT_SEGMENTS; i++) {
      const t = (i / ORBIT_SEGMENTS) * Math.PI * 2;
      const ox = Math.cos(t) * ORBIT_RADIUS_X;
      const oz = Math.sin(t) * ORBIT_RADIUS_Z;
      orbitPoints.push(new THREE.Vector3(ox, 0, oz));
    }
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
    });
    const orbitLine = new THREE.LineLoop(orbitGeometry, orbitMaterial);
    orbitLine.rotation.x = THREE.MathUtils.degToRad(18);
    orbitLine.rotation.z = THREE.MathUtils.degToRad(-12);
    scene.add(orbitLine);

    // Faceted, rocky nucleus using an icosahedron for a craggy silhouette.
    const nucleusGeometry = new THREE.IcosahedronGeometry(3, 2);
    const nucleusMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.6,
      roughness: 0.45,
      metalness: 0.05,
    });
    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
    nucleus.castShadow = false;
    nucleus.receiveShadow = false;
    cometGroup.add(nucleus);

    // Intense halo around the nucleus to mimic strong bloom.
    const haloGeometry = new THREE.SphereGeometry(6, 48, 48);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0xffffff),
      transparent: true,
      opacity: 0.27,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    cometGroup.add(halo);

    // Tail particles – very dense, forming a curved, elliptical streak.
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const life = new Float32Array(PARTICLE_COUNT);
    const maxLife = new Float32Array(PARTICLE_COUNT);

    const spawnRadius = 1.4;

    const tailDirection = new THREE.Vector3(-1, 0, 0); // updated each frame
    const tmpMain = new THREE.Vector3();
    const tmpSpread = new THREE.Vector3();

    const resetParticle = (i: number) => {
      const i3 = i * 3;

      // Spawn in a tight sphere around the nucleus (local space)
      const r = spawnRadius * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const sx = r * Math.sin(phi) * Math.cos(theta);
      const sy = r * Math.sin(phi) * Math.sin(theta);
      const sz = r * Math.cos(phi);

      positions[i3] = sx;
      positions[i3 + 1] = sy;
      positions[i3 + 2] = sz;

      const baseSpeed = prefersReducedMotion ? 0.5 : 0.85;
      const spread = prefersReducedMotion ? 0.2 : 0.35;

      tmpMain
        .copy(tailDirection)
        .normalize()
        .multiplyScalar(-baseSpeed * (1.2 + Math.random()));

      tmpSpread.set(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread * 0.4,
        (Math.random() - 0.5) * spread
      );

      tmpMain.add(tmpSpread);

      velocities[i3] = tmpMain.x;
      velocities[i3 + 1] = tmpMain.y;
      velocities[i3 + 2] = tmpMain.z;

      const maxL = prefersReducedMotion
        ? 4.0 + Math.random() * 2.0
        : 7.0 + Math.random() * 3.0; // seconds – longer life for a longer tail
      life[i] = maxL;
      maxLife[i] = maxL;
    };

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      resetParticle(i);
    }

    const tailGeometry = new THREE.BufferGeometry();
    tailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    const tailMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(0xffffff),
      size: prefersReducedMotion ? 0.045 : 0.06,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const tailPoints = new THREE.Points(tailGeometry, tailMaterial);
    tailPoints.frustumCulled = false;
    cometGroup.add(tailPoints);

    // Slight atmospheric haze for depth.
    scene.fog = new THREE.FogExp2(0x000000, prefersReducedMotion ? 0.006 : 0.012);

    const parallaxTarget = new THREE.Vector2(0, 0);
    const parallaxCurrent = new THREE.Vector2(0, 0);
    const parallaxStrength = prefersReducedMotion ? 0.2 : 0.45;

    const handleMouseMove = (event: MouseEvent) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      parallaxTarget.set(x * parallaxStrength, -y * parallaxStrength);
    };

    if (!prefersReducedMotion) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    const clock = new THREE.Clock();

    // Track previous position to derive forward direction along the orbit.
    const lastPos = new THREE.Vector3();
    const currentPos = new THREE.Vector3();
    let hasLastPos = false;

    let animationFrameId: number;

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Elliptical orbit parameters (XZ-plane with mild vertical undulation).
      const radiusX = 55;
      const radiusZ = 25;
      const radiusY = 12;
      const orbitSpeed = prefersReducedMotion ? 0.045 : 0.07;

      const angle = elapsed * orbitSpeed;
      const x = Math.cos(angle) * radiusX;
      const z = Math.sin(angle) * radiusZ;
      const y = Math.sin(angle * 0.7) * radiusY * 0.18;

      cometGroup.position.set(x, y, z);

      currentPos.copy(cometGroup.position);
      if (hasLastPos) {
        tailDirection.copy(currentPos).sub(lastPos).normalize();
      } else {
        hasLastPos = true;
      }
      lastPos.copy(currentPos);

      cometGroup.lookAt(currentPos.clone().add(tailDirection));
      cometGroup.rotation.y += 0.12; // subtle nucleus spin

      // Camera parallax
      parallaxCurrent.lerp(parallaxTarget, 0.08);
      camera.position.x = parallaxCurrent.x * 18;
      camera.position.y = 12 + parallaxCurrent.y * 10;
      camera.lookAt(new THREE.Vector3(0, 0, 0));

      const speedScale = prefersReducedMotion ? 1.0 : 1.25;
      const decayScale = prefersReducedMotion ? 0.8 : 1.0;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;

        positions[i3] += velocities[i3] * delta * speedScale;
        positions[i3 + 1] += velocities[i3 + 1] * delta * speedScale;
        positions[i3 + 2] += velocities[i3 + 2] * delta * speedScale;

        life[i] -= delta * decayScale;

        const dx = positions[i3];
        const dy = positions[i3 + 1];
        const dz = positions[i3 + 2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (life[i] <= 0 || distSq > 65000) {
          resetParticle(i);
        }
      }

      (tailGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;

      renderer.render(scene, camera);
      animationFrameId = window.requestAnimationFrame(animate);
    };

    animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (!prefersReducedMotion) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      window.cancelAnimationFrame(animationFrameId);

      tailGeometry.dispose();
      tailMaterial.dispose();
      nucleusGeometry.dispose();
      nucleusMaterial.dispose();
      haloGeometry.dispose();
      haloMaterial.dispose();

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
};

export default CometAnimation;
