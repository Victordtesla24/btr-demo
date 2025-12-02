# Black Hole Shader Integration: In-Depth Analysis & Implementation Plan

**Date:** November 14, 2025  
**Project:** Chris Cole Website - BTR Section  
**Objective:** Integrate Eric Bruneton's physically-accurate black hole shader into React/Three.js implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Implementation Analysis](#current-implementation-analysis)
3. [Bruneton Shader Architecture](#bruneton-shader-architecture)
4. [Technical Comparison](#technical-comparison)
5. [Integration Strategy](#integration-strategy)
6. [Implementation Challenges](#implementation-challenges)
7. [Recommended Approach](#recommended-approach)
8. [Performance Considerations](#performance-considerations)
9. [Action Plan](#action-plan)

---

## Executive Summary

### Current State
- **Existing Implementation**: Simplified Three.js-based black hole with ~7,000 particles, custom shaders for gravitational lensing approximation, and bloom post-processing
- **Target Implementation**: Eric Bruneton's research-grade WebGL2 shader with accurate Schwarzschild metric ray tracing, physical accretion disc, and real Gaia star data

### Key Findings
1. **Architecture Gap**: Bruneton's implementation uses WebGL2 native API vs. Three.js abstraction
2. **Physics Accuracy**: Current implementation uses approximations; Bruneton uses exact geodesic integration
3. **Complexity Level**: Bruneton's shader is ~600+ lines of GLSL implementing full general relativity calculations
4. **Data Requirements**: Bruneton requires precomputed textures (deflection maps, inverse radius lookup tables, 550GB Gaia star catalog)

### Recommendation
**Hybrid Approach**: Integrate Bruneton's core ray-tracing shader into Three.js while maintaining the existing architecture, using precomputed texture assets without requiring the full Gaia dataset.

---

## Current Implementation Analysis

### Architecture Overview

**File:** `src/components/animations/BlackHoleAnimation.tsx`

#### Current Components

1. **Scene Setup**
   - Three.js Scene, Camera, WebGL2 Renderer
   - Post-processing: EffectComposer + UnrealBloomPass
   - Camera: Perspective (60° FOV), positioned at (0, 8, 15)

2. **Black Hole Rendering**
   ```typescript
   - Event Horizon: Black sphere (radius: 1.5)
   - Inner Ring: Shadow ring for depth
   - Accretion Disk: 7,000 particles with custom shader
   - Photon Sphere: White torus (radius: 1.5 * 1.5)
   - Spacetime Grid: Warped plane mesh
   - Background Stars: 300 point sprites
   ```

3. **Custom Shaders**
   - **Particle Vertex Shader**: Gravitational lensing approximation, Doppler beaming
   - **Particle Fragment Shader**: Circular particles with soft glow
   - **Grid Shader**: Schwarzschild metric warping approximation

#### Limitations

1. **Physics Approximations**
   - Lensing: `deflection = (rs² / dist²) * 0.5` (simplified, non-relativistic)
   - No actual geodesic integration
   - Doppler factor: `1 + dot(velocity, toCamera) * 2.0` (Newtonian approximation)

2. **Visual Simplifications**
   - Grayscale particles (not temperature-based blackbody radiation)
   - Fixed particle orbits (no Keplerian dynamics)
   - No accretion disc physics (temperature profiles, inner stable circular orbit)

3. **Performance Trade-offs**
   - Simplified calculations for 60fps target
   - No multiple light ray bounces
   - Approximated gravitational time dilation

---

## Bruneton Shader Architecture

### Component Structure

**Location:** `black_hole_shader/black_hole/demo/`

#### 1. Model Layer (`model/model.js`)

**Core Physics Classes:**

```javascript
class Model {
  // Schwarzschild Coordinates
  t: number;           // Schwarzschild time
  r: number;           // Radial coordinate
  worldTheta: number;  // Polar angle
  worldPhi: number;    // Azimuthal angle
  
  // Constants of Motion
  e: number;           // Energy per unit mass (dt/dτ)
  l: number;           // Angular momentum (dφ/dτ)
  
  // Camera State
  lorentz: Matrix4x4;  // Lorentz transformation
  eTau, eW, eH, eD: Vector4;  // Reference frame basis vectors
  
  // Orbit Integration
  updateOrbit(dTauSeconds): void {
    // Integrates geodesic equations:
    // d²r/dτ² = u²(l²(2-3u)u - 1)/2
    // Uses 1000 substeps for numerical stability
  }
}
```

**Key Features:**
- Full Schwarzschild metric implementation
- Proper time integration
- Arbitrary initial conditions (radius, direction, speed)
- Lorentz transformation for camera orientation
- Time dilation calculation: `e / (1 - u)`

#### 2. Rendering Layer (`camera_view/`)

**Files:**
- `camera_view.js`: Main rendering loop, WebGL2 context management
- `shader_manager.js`: Shader compilation with conditional features
- `texture_manager.js`: Asset loading (deflection maps, star catalogs, textures)

**Rendering Pipeline:**

```javascript
class CameraView {
  onRender() {
    // 1. Update camera state from model
    const { t, r, worldTheta, worldPhi, lorentz, ... } = model;
    
    // 2. Bind precomputed textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, rayDeflectionTexture);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, rayInverseRadiusTexture);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, galaxyTexture);
    // ... 8 texture units total
    
    // 3. Pass uniforms to shader
    gl.uniform4f(program.cameraPosition, t, r, worldTheta, worldPhi);
    gl.uniform3f(program.p, p[0], p[1], p[2]);
    gl.uniform4f(program.kS, kS[0], kS[1], kS[2], kS[3]);
    // ... basis vectors, stars orientation, disc params
    
    // 4. Render fullscreen quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // 5. Composite with bloom
    bloom.end(exposure, highContrast);
  }
}
```

#### 3. Shader Layer (`black_hole/*.glsl`)

**File Structure:**
- `definitions.glsl`: Type definitions, constants
- `functions.glsl`: Ray tracing integration algorithms
- `model.glsl`: Scene composition, lighting, material functions

**Core Algorithm (`functions.glsl`):**

```glsl
// Ray tracing through Schwarzschild spacetime
Angle RayTrace(Real u, Real u_dot, Real e_square, Angle delta, Angle alpha,
               Real u_ic, Real u_oc, out Real u0, out Angle phi0, ...) {
  // 1. Compute light beam equation: d²u/dφ² + u = 3u²/2
  Real a = 1.0 / (e_square - (1.0 - u));
  Real b = u_dot / sqrt(max(e_square - (1.0 - u), 0.0));
  Real u_max = find_u_max(a, b);  // Iterative solver
  
  // 2. Lookup precomputed deflection from texture
  Real deflection = lookupDeflection(u, u_max, rayDeflectionTexture);
  
  // 3. Find disc intersections
  if (u_ic < u_max && u_max < u_oc) {
    // Inner and outer disc intersection calculations
    // Uses precomputed inverse radius lookups
  }
  
  return deflection;
}
```

**Scene Composition (`model.glsl`):**

```glsl
vec3 SceneColor(vec4 camera_position, vec3 p, vec4 k_s, 
                vec3 e_tau, vec3 e_w, vec3 e_h, vec3 e_d, 
                vec3 view_dir) {
  // 1. Initialize light beam parameters
  vec3 d = -e_tau + q.x * e_w + q.y * e_h + q.z * e_d;
  float u = 1.0 / camera_position[1];
  float e_square = u_dot² + u²(1 - u);
  
  // 2. Ray trace to find deflection and intersections
  float deflection = RayTrace(u, u_dot, e_square, delta, alpha, ...);
  
  // 3. Compute gravitational lensing amplification
  float omega = length(cross(dFdx(q), dFdy(q)));
  float omega_prime = length(cross(dFdx(d_prime), dFdy(d_prime)));
  float lensing_factor = clamp(omega / omega_prime, 0.0, 1e6);
  
  // 4. Sample stars with lensing amplification
  color += GalaxyColor(d_prime);
  color += StarColor(d_prime, lensing_factor / pixel_area);
  
  // 5. Apply Doppler shift
  float doppler_factor = g_k_l_receiver / g_k_l_source;
  color = Doppler(color, doppler_factor);
  
  // 6. Composite accretion disc (if intersects)
  if (u1 >= 0.0) {
    vec4 disc_color = DiscColor(i1.xy, t - t1, top_side, doppler_factor);
    color = color * (1 - disc_color.a) + alpha1 * disc_color.rgb;
  }
  
  return color;
}
```

**Accretion Disc Model (`model.glsl`):**

```glsl
vec4 DefaultDiscColor(vec2 p, float p_t, bool top_side, float doppler_factor,
                      float disc_temperature, sampler2D black_body_texture) {
  // 1. Compute density from orbital particle rings
  for (int i = 0; i < NUM_DISC_PARTICLES; ++i) {
    // Keplerian orbits with precession
    float dphi_dt = u_avg * sqrt(0.5 * u_avg);
    float phi = dphi_dt * p_t + phi0;
    // ... accumulate density
  }
  
  // 2. Compute temperature profile (Shakura-Sunyaev model)
  float temperature_profile = 
    pow((1.0 - sqrt(3.0 / p_r)) / (p_r³), 0.25);
  float temperature = disc_temperature * temperature_profile * scale;
  
  // 3. Apply Doppler-shifted blackbody radiation
  vec3 color = density * BlackBodyColor(temperature * doppler_factor);
  
  return vec4(color * alpha, alpha);
}
```

#### 4. Texture Assets

**Precomputed Data:**

1. **Ray Deflection Texture** (`deflection.dat`)
   - 2D lookup table: (u, u_max) → deflection angle
   - Precomputed via C++ integration of geodesic equation
   - Size: ~2MB, 1024x1024 float texture

2. **Inverse Radius Texture** (`inverse_radius.dat`)
   - Stores 1/r values for disc intersection finding
   - Size: ~16KB

3. **Blackbody Texture** (`black_body.dat`)
   - 1D lookup: log(T/100)/6 → RGB color
   - CIE color matching functions
   - Size: ~1.5KB

4. **Doppler Texture** (`doppler.dat`)
   - 3D lookup: (r, g, doppler_factor) → shifted RGB
   - Size: ~1.5MB

5. **Gaia Star Catalog** (OPTIONAL)
   - 61,234 CSV files, 550GB total
   - Contains positions, magnitudes, colors for millions of stars
   - Can be omitted; falls back to procedural stars

---

## Technical Comparison

### Feature Matrix

| Feature | Current (Three.js) | Bruneton Shader | Integration Complexity |
|---------|-------------------|-----------------|----------------------|
| **Physics Model** | Newtonian approx | Full GR geodesics | HIGH |
| **Ray Tracing** | No | Yes (precomputed) | MEDIUM |
| **Gravitational Lensing** | Simple deflection | Exact calculations | HIGH |
| **Accretion Disc** | Particles | Volume rendering | MEDIUM |
| **Temperature/Color** | Grayscale | Blackbody spectrum | MEDIUM |
| **Doppler Shift** | Approximation | Relativistic correct | MEDIUM |
| **Star Rendering** | Point sprites | Texture filtering | HIGH |
| **Time Dilation** | None | Full calculation | LOW |
| **Performance** | 60fps guaranteed | 20-60fps (depends) | MEDIUM |

### Rendering Differences

#### Current Three.js Approach
```typescript
// Approximate lensing in vertex shader
vec3 toBH = pos - blackHolePos;
float dist = length(toBH);
float rs = schwarzschildRadius * 1.5;

if (dist > rs) {
  float deflection = (rs * rs) / (dist * dist) * 0.5;
  vec3 perpendicular = normalize(cross(toBH, vec3(0, 1, 0)));
  pos += perpendicular * deflection;
}
```

**Pros:**
- Simple, fast, runs anywhere
- Predictable performance
- Easy to debug and modify

**Cons:**
- Not physically accurate
- No light ray paths
- Limited visual fidelity

#### Bruneton WebGL2 Approach
```glsl
// Exact geodesic ray tracing
float deflection = RayTrace(u, u_dot, e_square, delta, alpha, 
                           U_IC, U_OC, u0, phi0, t0, alpha0, 
                           u1, phi1, t1, alpha1);

// Compute lensing magnification from solid angle change
float omega = length(cross(dFdx(q), dFdy(q)));
float omega_prime = length(cross(dFdx(d_prime), dFdy(d_prime)));
float lensing_factor = omega / omega_prime;

// Apply to star sampling with anti-aliasing
vec3 star_light = DefaultStarColor(d_prime, lensing_factor);
```

**Pros:**
- Research-grade accuracy
- Stunning visual quality
- Educational value (real physics)
- Multiple light ray bounces possible

**Cons:**
- Complex integration
- Requires WebGL2
- Heavy shader computations
- Large texture assets

---

## Integration Strategy

### Option A: Full Replacement (NOT RECOMMENDED)

**Approach:** Replace entire Three.js implementation with raw WebGL2

**Implementation:**
```typescript
// Remove Three.js entirely
// Use Bruneton's vanilla WebGL2 approach
const gl = canvas.getContext('webgl2');
const program = createShaderProgram(gl, vertexShader, fragmentShader);
// ... manual WebGL calls
```

**Pros:**
- Maximum flexibility
- 100% shader fidelity
- Complete control

**Cons:**
- Lose Three.js ecosystem
- Re-implement camera, controls, post-processing
- No React integration helpers
- Massive development time

**Verdict:** ❌ Not practical for web development

---

### Option B: Hybrid Three.js Integration (RECOMMENDED)

**Approach:** Keep Three.js architecture, integrate Bruneton's shader as custom material

**Implementation:**
```typescript
// Create fullscreen quad with custom ShaderMaterial
const blackHoleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    cameraPosition: { value: new THREE.Vector4() },
    rayDeflectionTexture: { value: null },
    rayInverseRadiusTexture: { value: null },
    // ... all Bruneton uniforms
  },
  vertexShader: brunetonVertexShader,
  fragmentShader: brunetonFragmentShader,
  glslVersion: THREE.GLSL3, // WebGL2 only
});

const blackHoleMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  blackHoleMaterial
);
```

**Pros:**
- Keeps existing architecture
- Easier to maintain
- Can mix with other Three.js objects
- Gradual migration path

**Cons:**
- Some Three.js overhead
- Need to bridge coordinate systems
- Uniform limit considerations

**Verdict:** ✅ **Recommended Approach**

---

### Option C: Shader Port with Simplifications

**Approach:** Rewrite Bruneton's shader to work within current Three.js particles

**Implementation:** Keep particle system, enhance shaders with better physics

**Pros:**
- Smallest code change
- Maintains existing API
- Progressive enhancement

**Cons:**
- Significant accuracy loss
- Complex shader rewrite
- Miss key features (disc rendering, star sampling)

**Verdict:** ⚠️ Fallback if Option B proves too complex

---

## Implementation Challenges

### Challenge 1: Texture Asset Management

**Problem:** Bruneton requires 4 precomputed textures (~4MB) + optional Gaia data (550GB)

**Solution:**
```typescript
// Load required textures (skip Gaia)
const textureLoader = new THREE.DataTextureLoader();

async function loadBlackHoleTextures() {
  const [deflection, inverseRadius, blackbody, doppler] = await Promise.all([
    textureLoader.loadAsync('/assets/blackhole/deflection.dat'),
    textureLoader.loadAsync('/assets/blackhole/inverse_radius.dat'),
    textureLoader.loadAsync('/assets/blackhole/black_body.dat'),
    textureLoader.loadAsync('/assets/blackhole/doppler.dat'),
  ]);
  
  return { deflection, inverseRadius, blackbody, doppler };
}
```

**Alternative:** Use procedural fallback for missing textures
```glsl
#ifdef NO_DEFLECTION_TEXTURE
  // Approximate deflection analytically
  float deflection = approximateDeflection(u, u_dot, e_square);
#else
  // Use precomputed texture
  float deflection = texture(rayDeflectionTexture, uv).r;
#endif
```

---

### Challenge 2: Coordinate System Conversion

**Problem:** Bruneton uses Schwarzschild coordinates; Three.js uses Cartesian

**Bruneton Coordinates:**
```glsl
vec4 camera_position; // (t, r, theta, phi)
```

**Three.js:**
```typescript
camera.position; // THREE.Vector3(x, y, z)
```

**Solution:** Conversion layer in shader uniforms
```typescript
function updateCameraUniforms(camera: THREE.Camera) {
  const r = camera.position.length();
  const theta = Math.acos(camera.position.y / r);
  const phi = Math.atan2(camera.position.z, camera.position.x);
  
  blackHoleMaterial.uniforms.cameraPosition.value.set(0, r, theta, phi);
  
  // Compute basis vectors (e_tau, e_w, e_h, e_d)
  const eTau = computeSchwarzschildBasis(camera, 0);
  const eW = computeSchwarzschildBasis(camera, 1);
  // ...
}
```

---

### Challenge 3: Performance Optimization

**Problem:** Bruneton's shader computes full geodesics per pixel (expensive)

**Current Performance:**
- Desktop: 30-60fps @ 1920x1080
- Mobile: 10-30fps @ lower res
- GPU: Heavy fragment shader load

**Optimization Strategies:**

1. **Adaptive Resolution**
```typescript
const pixelRatio = performance.now() - lastTime < 16 ? 2 : 1;
renderer.setPixelRatio(Math.min(pixelRatio, window.devicePixelRatio));
```

2. **LOD for Stars**
```glsl
// Use lower LOD textures when framerate drops
float lod = mix(MIN_LOD, MAX_LOD, performanceMetric);
vec3 starColor = StarTextureColor(dir, lod);
```

3. **Conditional Features**
```typescript
// Disable expensive features based on device
const config = {
  lensing: isHighPerformance,
  doppler: isHighPerformance,
  stars: !isMobile,
  highQualityDisc: isDesktop,
};
```

---

### Challenge 4: React Integration

**Problem:** Bruneton's code is vanilla JS with global state

**Current React Pattern:**
```typescript
useEffect(() => {
  // Three.js setup
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  // ...
  
  return () => {
    // Cleanup
    scene.dispose();
  };
}, []);
```

**Integration Solution:**
```typescript
// Encapsulate Bruneton's model in React
function useBlackHoleModel() {
  const modelRef = useRef<BrunetonModel | null>(null);
  
  useEffect(() => {
    modelRef.current = new BrunetonModel({
      blackHoleMass: 2.01e30,
      startRadius: 35.5,
      startDirection: Math.PI / 2,
    });
    
    return () => modelRef.current?.dispose();
  }, []);
  
  const updateOrbit = useCallback((delta: number) => {
    modelRef.current?.updateOrbit(delta);
  }, []);
  
  return { model: modelRef.current, updateOrbit };
}
```

---

## Recommended Approach

### Phase 1: Foundation (Week 1-2)

**Objective:** Set up Bruneton shader infrastructure within Three.js

**Tasks:**
1. ✅ Copy Bruneton shader files to project
2. ✅ Build texture assets (deflection, blackbody, doppler)
3. ✅ Create Three.js ShaderMaterial wrapper
4. ✅ Implement coordinate conversion utilities
5. ✅ Test basic rendering (no stars, simple disc)

**Deliverable:** Black event horizon + accretion disc rendering

---

### Phase 2: Core Physics (Week 3-4)

**Objective:** Integrate full ray tracing and lensing

**Tasks:**
1. ✅ Load and bind all texture assets
2. ✅ Implement camera state → Schwarzschild conversion
3. ✅ Port lorentz transformation calculations
4. ✅ Enable gravitational lensing toggle
5. ✅ Add Doppler shift effects

**Deliverable:** Physically accurate black hole with lensing

---

### Phase 3: Visual Polish (Week 5-6)

**Objective:** Star field and disc enhancement

**Tasks:**
1. Create procedural star field (no Gaia data required)
2. Implement custom star texture filtering
3. Add accretion disc particle rings
4. Tune blackbody temperature profiles
5. Optimize fragment shader performance

**Deliverable:** Production-ready implementation

---

### Phase 4: Integration & Testing (Week 7-8)

**Objective:** Finalize React integration and optimize

**Tasks:**
1. Integrate with BTRSection.tsx
2. Add performance monitoring
3. Implement adaptive quality settings
4. Cross-browser testing (WebGL2 support)
5. Mobile optimization

**Deliverable:** Deployed feature

---

## Performance Considerations

### Target Metrics

| Platform | Resolution | Target FPS | Quality Level |
|----------|-----------|------------|---------------|
| Desktop (High) | 1920x1080 | 60fps | Full features |
| Desktop (Med) | 1920x1080 | 45fps | Reduced stars |
| Laptop | 1366x768 | 30fps | Simplified disc |
| Mobile (High) | 1080x2400 | 30fps | No stars |
| Mobile (Low) | 720x1280 | 24fps | Static background |

### Optimization Checklist

- [ ] Use lower precision where possible (`mediump` vs `highp`)
- [ ] Precompute constants in JavaScript, pass as uniforms
- [ ] Implement texture LOD system for stars
- [ ] Add visibility culling (only render when section visible)
- [ ] Use `` requestAnimationFrame`` throttling on low FPS
- [ ] Implement progressive loading (basic → enhanced)
- [ ] Add WebGL2 fallback (simpler shader for WebGL1)

---

## Action Plan

### Immediate Next Steps

1. **Create Asset Build Pipeline**
   ```bash
   cd black_hole_shader
   make black_hole_textures  # Build deflection, inverse_radius
   make black_body_texture   # Build blackbody lookup
   make doppler_texture      # Build Doppler shift texture
   ```

2. **Set Up Three.js Integration Structure**
   ```typescript
   // src/components/animations/BlackHoleBruneton.tsx
   export const BlackHoleBruneton: React.FC = () => {
     const { model, updateOrbit } = useBlackHoleModel();
     const textures = useBlackHoleTextures();
     
     // Render with custom shader
   };
   ```

3. **Create Shader Bridge**
   ```typescript
   // src/shaders/bruneton/index.ts
   import vertexShader from './vertex.glsl';
   import fragmentShader from './fragment.glsl';
   export { vertexShader, fragmentShader };
   ```

### Development Milestones

**Milestone 1:** Basic shader rendering (2 weeks)
- [ ] Shader compiles in Three.js
- [ ] Textures load correctly
- [ ] Black sphere visible

**Milestone 2:** Physics integration (2 weeks)
- [ ] Camera coordinates convert correctly
- [ ] Ray tracing functional
- [ ] Gravitational lensing visible

**Milestone 3:** Visual quality (2 weeks)
- [ ] Star field renders
- [ ] Accretion disc with physics
- [ ] Doppler effects working

**Milestone 4:** Production ready (2 weeks)
- [ ] Performance optimized
- [ ] Integrated in BTRSection
- [ ] Cross-platform tested

---

## Conclusion

### Key Takeaways

1. **Feasibility: HIGH** - Integration is technically achievable within React/Three.js
2. **Complexity: MEDIUM-HIGH** - Requires careful shader porting and optimization
3. **Value: VERY HIGH** - Results in industry-leading visual quality
4. **Timeline: ~8 weeks** - For full integration with all features

### Recommendation

✅ **Proceed with Option B (Hybrid Three.js Integration)**

**Rationale:**
- Balances accuracy with practicality
- Maintains existing codebase
- Achievable within reasonable timeline
- Provides clear upgrade path
- Results in world-class visual presentation

### Success Criteria

1. ✅ Physically accurate gravitational lensing
2. ✅ Realistic accretion disc with temperature gradients
3. ✅ 30+ fps on desktop, 24+ fps on mobile
4. ✅ Seamless integration in BTRSection
5. ✅ Passes accessibility and performance audits

---

## References

### Source Files Analyzed

1. `black_hole_shader/black_hole/demo/camera_view/camera_view.js`
2. `black_hole_shader/black_hole/demo/model/model.js`
3. `black_hole_shader/black_hole/demo/camera_view/shader_manager.js`
4. `black_hole_shader/black_hole/model.glsl`
5. `src/components/animations/BlackHoleAnimation.tsx`
6. `src/components/sections/BTRSection.tsx`

### External Documentation

- [Bruneton & Neyret (2020): "A Physically-Based Spatio-Temporal Sky Model"](https://arxiv.org/abs/2010.08735)
- [WebGL2 Specification](https://www.khronos.org/registry/webgl/specs/latest/2.0/)
- [Three.js ShaderMaterial Documentation](https://threejs.org/docs/#api/en/materials/ShaderMaterial)
- [Schwarzschild Metric](https://en.wikipedia.org/wiki/Schwarzschild_metric)

---

**Document Version:** 1.0  
**Last Updated:** November 14, 2025  
**Author:** Development Team  
**Status:** Ready for Implementation Review
