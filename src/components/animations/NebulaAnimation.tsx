'use client';

import React, { useEffect, useRef } from 'react';

/**
 * NebulaAnimation
 *
 * WebGL full-screen quad rendering of the volumetric nebula shader from
 * http://glslsandbox.com/e#31308.0 (via FlexMonkey/Nebula's NebulaShader.cikernel).
 *
 * The shader is kept structurally identical to the original so the motion and
 * volumetric feel match the reference, but the final color is converted to
 * monochrome (grayscale) to align with the portfolio's black & white theme.
 */

export interface NebulaAnimationProps {
  /**
   * When false, the WebGL context is not created and a static black background
   * is rendered instead. This lets callers gate the heavy animation on
   * visibility (e.g. IntersectionObserver) if desired.
   */
  isActive?: boolean;
  className?: string;
}

const VERT_SHADER_SOURCE = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Fragment shader adapted from Nebula/Nebula/NebulaShader.cikernel
// - Converted from CIColorKernel to standard WebGL fragment shader
// - destCoord() -> gl_FragCoord
// - time, mouse, resolution -> uniforms
// - Final color converted to grayscale to match monochrome theme
const FRAG_SHADER_SOURCE = `
#ifdef GL_ES
precision highp float;
#endif

uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_resolution;

#define iterations 4
#define formuparam2 0.89

#define volsteps 5
#define stepsize 0.190

#define zoom 3.900
#define tile   0.450
#define speed2  0.010

#define brightness 0.2
#define darkmatter 0.400
#define distfading 0.560
#define saturation 0.400

#define transverseSpeed 1.1
#define cloud 0.2

float field(in vec3 p, float time)
{
  float strength = 7. + .03 * log(1.e-6 + fract(sin(time) * 4373.11));
  float accum = 0.;
  float prev = 0.;
  float tw = 0.;

  for (int i = 0; i < 6; ++i)
  {
    float mag = dot(p, p);
    p = abs(p) / mag + vec3(-.5, -.8 + 0.1 * sin(time * 0.2 + 2.0), -1.1 + 0.3 * cos(time * 0.15));
    float w = exp(-float(i) / 7.);
    accum += w * exp(-strength * pow(abs(mag - prev), 2.3));
    tw += w;
    prev = mag;
  }
  return max(0., 5. * accum / tw - .7);
}

void main(void) {
  vec2 uv2 = 2.0 * gl_FragCoord.xy / u_resolution.xy - 1.0;
  vec2 uvs = uv2 * u_resolution.xy / max(u_resolution.x, u_resolution.y);

  float time = u_time;

  float speed = speed2;
  speed = 0.005 * cos(time * 0.02 + 3.1415926 / 4.0);

  float formuparam = formuparam2;

  vec2 uv = uvs;

  // mouse rotation
  float a_xz = 0.9;
  float a_yz = -.6;
  float a_xy = 0.9 + time * 0.04;

  mat2 rot_xz = mat2(cos(a_xz), sin(a_xz), -sin(a_xz), cos(a_xz));
  mat2 rot_yz = mat2(cos(a_yz), sin(a_yz), -sin(a_yz), cos(a_yz));
  mat2 rot_xy = mat2(cos(a_xy), sin(a_xy), -sin(a_xy), cos(a_xy));

  float v2 = 1.0;

  vec3 dir = vec3(uv * zoom, 1.);
  vec3 from = vec3(0.0, 0.0, 0.0);

  from.x -= .5 * (u_mouse.x - 0.5);
  from.y -= .5 * (u_mouse.y - 0.5);

  vec3 forward = vec3(0., 0., 1.);

  from.x += transverseSpeed * (1.0) * cos(0.01 * time) + 0.001 * time;
  from.y += transverseSpeed * (1.0) * sin(0.01 * time) + 0.001 * time;

  from.z += 0.003 * time;

  dir.xy *= rot_xy;
  forward.xy *= rot_xy;

  dir.xz *= rot_xz;
  forward.xz *= rot_xz;

  dir.yz *= rot_yz;
  forward.yz *= rot_yz;

  from.xy *= -rot_xy;
  from.xz *= rot_xz;
  from.yz *= rot_yz;

  // zoom
  float zooom = (time - 3311.) * speed;
  from += forward * zooom;
  float sampleShift = mod(zooom, stepsize);

  float zoffset = -sampleShift;
  sampleShift /= stepsize; // make from 0 to 1

  // volumetric rendering
  float s = 0.24;
  float s3 = s + stepsize / 2.0;
  vec3 v = vec3(0.0);
  float t3 = 0.0;

  vec3 backCol2 = vec3(0.0);
  for (int r = 0; r < volsteps; r++) {
    vec3 p2 = from + (s + zoffset) * dir;
    vec3 p3 = (from + (s3 + zoffset) * dir) * (1.9 / zoom);

    p2 = abs(vec3(tile) - mod(p2, vec3(tile * 2.0))); // tiling fold
    p3 = abs(vec3(tile) - mod(p3, vec3(tile * 2.0))); // tiling fold

    #ifdef cloud
    t3 = field(p3, time);
    #endif

    float pa, a = pa = 0.0;
    for (int i = 0; i < iterations; i++) {
      p2 = abs(p2) / dot(p2, p2) - formuparam;
      float D = abs(length(p2) - pa);

      if (i > 2)
      {
        a += i > 7 ? min(12., D) : D;
      }
      pa = length(p2);
    }

    a *= a * a; // add contrast

    float s1 = s + zoffset;
    float fade = pow(distfading, max(0., float(r) - sampleShift));

    v += fade;

    // fade out samples as they approach the camera
    if (r == 0)
      fade *= (1. - (sampleShift));
    // fade in samples as they approach from the distance
    if (r == volsteps - 1)
      fade *= sampleShift;

    v += vec3(s1, s1 * s1, s1 * s1 * s1 * s1) * a * brightness * fade; // coloring based on distance

    backCol2 += mix(.4, 1., v2) * vec3(0.20 * t3 * t3 * t3, 0.4 * t3 * t3, t3 * 0.7) * fade;

    s += stepsize;
    s3 += stepsize;
  }

  v = mix(vec3(length(v)), v, saturation); // color adjust

  vec4 forCol2 = vec4(v * .01, 1.0);

  #ifdef cloud
  backCol2 *= cloud;
  #endif

  vec4 result = forCol2 + vec4(backCol2, 1.0);

  // Monochrome conversion to respect site theme
  float lum = dot(result.rgb, vec3(0.299, 0.587, 0.114));
  vec3 gray = vec3(lum);

  gl_FragColor = vec4(gray, 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to create shader');
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || 'Unknown shader compile error';
    gl.deleteShader(shader);
    throw new Error(info);
  }

  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string): WebGLProgram {
  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);
    throw new Error('Failed to create WebGL program');
  }

  gl.attachShader(program, vertShader);
  gl.attachShader(program, fragShader);
  gl.linkProgram(program);

  gl.deleteShader(vertShader);
  gl.deleteShader(fragShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) || 'Unknown program link error';
    gl.deleteProgram(program);
    throw new Error(info);
  }

  return program;
}

const NebulaAnimation: React.FC<NebulaAnimationProps> = ({ isActive = true, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  // Basic mouse tracking for subtle parallax; normalized 0-1.
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      mouseRef.current = {
        x: e.clientX / vw,
        y: 1.0 - e.clientY / vh,
      };
    };

    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      // Graceful fallback: just leave canvas blank/black.
      return;
    }

    let program: WebGLProgram | null = null;
    let positionBuffer: WebGLBuffer | null = null;
    let aPositionLocation: number;
    let uTimeLocation: WebGLUniformLocation | null = null;
    let uMouseLocation: WebGLUniformLocation | null = null;
    let uResolutionLocation: WebGLUniformLocation | null = null;

    try {
      program = createProgram(gl, VERT_SHADER_SOURCE, FRAG_SHADER_SOURCE);
      gl.useProgram(program);

      aPositionLocation = gl.getAttribLocation(program, 'a_position');
      uTimeLocation = gl.getUniformLocation(program, 'u_time');
      uMouseLocation = gl.getUniformLocation(program, 'u_mouse');
      uResolutionLocation = gl.getUniformLocation(program, 'u_resolution');

      // Full-screen quad (two triangles) in clip space
      const vertices = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]);

      positionBuffer = gl.createBuffer();
      if (!positionBuffer) {
        throw new Error('Failed to create position buffer');
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      gl.enableVertexAttribArray(aPositionLocation);
      gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.clearColor(0, 0, 0, 1);
    } catch (err) {
      // If shader compilation fails, we silently fail back to black;
      // this avoids breaking the rest of the page.
      console.error('Nebula WebGL init failed:', err);
      return () => {};
    }

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      gl.viewport(0, 0, width, height);

      if (uResolutionLocation) {
        gl.uniform2f(uResolutionLocation, width, height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const render = (now: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = now;
      }
      const elapsed = (now - startTimeRef.current) / 1000.0;

      gl.clear(gl.COLOR_BUFFER_BIT);

      if (uTimeLocation) {
        gl.uniform1f(uTimeLocation, elapsed);
      }
      if (uMouseLocation) {
        const { x, y } = mouseRef.current;
        gl.uniform2f(uMouseLocation, x, y);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      rafRef.current = window.requestAnimationFrame(render);
    };

    rafRef.current = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (program) {
        gl.deleteProgram(program);
      }
      if (positionBuffer) {
        gl.deleteBuffer(positionBuffer);
      }
    };
  }, [isActive]);

  // When inactive, render a static black backdrop to keep layout consistent.
  if (!isActive) {
    return (
      <div
        className={`nebula-canvas-container ${className}`.trim()}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          backgroundColor: '#000',
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`nebula-canvas-container ${className}`.trim()}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
        aria-hidden="true"
      />
    </div>
  );
};

export default NebulaAnimation;
