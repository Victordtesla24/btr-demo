const BLOOM_FILTERS = [
  600,
  [[0.537425,0.0200664,0.007208,0.00159718,0.000907513,0.000275876],
   [0.102788,0.0185028,0.00291085,0.000519275,0.000519275,0.000519275],
   [0.0704584,0.0181098,0.0023275,0.0023275,0.0015737,0.0015737],
   [0.0117432,0.0117432,0.00226476,0.00154524,0.00116041,0.00116041],
   [0.00746694,0.00746694,0.00171226,0.00104832,0.000766639,0.000766639],
   [0.00478257,0.00478257,0.00100513,0.000818812,0.000397319,0.000397319],
   [0.0037712,0.0037712,0.000490892,0.000490892,0.000490892,0.000490892],
   [0.00108603,0.00108603,0.000924505,0.000924505,0.000141375,0],
   [0.000604275,0.000604275,0.000604275,0.000604275,0.000604275,0.000604275]],
  800,
  [[0.368483,0.0216534,0.00816293,0.00188936,0.00108653,0.000313168],
   [0.136253,0.0234525,0.00447162,0.000355714,0.000355714,0.000355714],
   [0.115474,0.0273796,0.00361203,0.00361203,0.0024381,0.0024381],
   [0.0185586,0.0185586,0.00364917,0.00244913,0.00186549,0.00186549],
   [0.0120676,0.0120676,0.00279834,0.00169768,0.00125113,0.00125113],
   [0.00782081,0.00782081,0.00165564,0.00133947,0.000653398,0.000653398],
   [0.00620986,0.00620986,0.0008107,0.0008107,0.0008107,0.0008107],
   [0.0017856,0.0017856,0.00153169,0.00153169,0.000231589,0],
   [0.000999843,0.000999843,0.000999843,0.000999843,0.000999843,0.000999843]],
  1000,
  [[0.25617,0.0203532,0.00797079,0.00192066,0.0011167,0.000302221],
   [0.153198,0.0252384,0.00568919,5.11613e-05,5.11613e-05,5.11613e-05],
   [0.15413,0.0348563,0.00470555,0.00470555,0.00317817,0.00317817],
   [0.0246407,0.0246407,0.0049419,0.00326094,0.00251954,0.00251954],
   [0.0163845,0.0163845,0.00384115,0.00230972,0.00171516,0.00171516],
   [0.010743,0.010743,0.00229079,0.00184054,0.000902617,0.000902617],
   [0.00858938,0.00858938,0.00112463,0.00112463,0.00112463,0.00112463],
   [0.00246603,0.00246603,0.0021316,0.0021316,0.000318642,0],
   [0.00138965,0.00138965,0.00138965,0.00138965,0.00138965,0.00138965]],
  1200,
  [[0.183275,0.018158,0.00737877,0.00184954,0.00109975,0.000302254],
   [0.155445,0.0265729,0.00631126,0,0,0],
   [0.175386,0.0406837,0.00558637,0.00558637,0.00379344,0.00379344],
   [0.0298822,0.0298822,0.00611925,0.00396558,0.0031087,0.0031087],
   [0.0203221,0.0203221,0.00481553,0.00287054,0.00214781,0.00214781],
   [0.0134794,0.0134794,0.00289523,0.00230992,0.00113896,0.00113896],
   [0.0108519,0.0108519,0.00142504,0.00142504,0.00142504,0.00142504],
   [0.00311065,0.00311065,0.0027096,0.0027096,0.000400401,0],
   [0.00176416,0.00176416,0.00176416,0.00176416,0.00176416,0.00176416]],
  1400,
  [[0.13507,0.0158288,0.00665188,0.00173212,0.00105691,0.000301843],
   [0.150223,0.0270591,0.00654116,0,0,0],
   [0.188342,0.0450055,0.00639366,0.00624994,0.00430739,0.00430739],
   [0.034393,0.034393,0.00718938,0.00457885,0.00363943,0.00363943],
   [0.0239204,0.0239204,0.00572746,0.00338533,0.00255211,0.00255211],
   [0.016048,0.016048,0.00347179,0.00275076,0.00136368,0.00136368],
   [0.013009,0.013009,0.00171332,0.00171332,0.00171332,0.00171332],
   [0.00372296,0.00372296,0.00326808,0.00326808,0.000477361,0],
   [0.00212503,0.00212503,0.00212503,0.00212503,0.00212503,0.00212503]],
  1600,
  [[0.102246,0.0136713,0.00592178,0.0015983,0.0010003,0.000299286],
   [0.141572,0.0268007,0.00657127,0,0,0],
   [0.19617,0.0482117,0.00708174,0.00676652,0.00473424,0.00473424],
   [0.0382987,0.0382987,0.00816851,0.00511466,0.00412131,0.00412131],
   [0.0272343,0.0272343,0.00658765,0.00386174,0.00293298,0.00293298],
   [0.0184784,0.0184784,0.00402643,0.0031681,0.00157908,0.00157908],
   [0.0150825,0.0150825,0.00199223,0.00199223,0.00199223,0.00199223],
   [0.00430923,0.00430923,0.00381212,0.00381212,0.00055036,0],
   [0.00247558,0.00247558,0.00247558,0.00247558,0.00247558,0.00247558]],
];

// Provides a bloom shader effect by mipmapping an input image, filtering each
// mipmap with a small kernel, and upsampling and adding the filtered images.

const MAX_LEVELS = 9;
const MAX_FLOAT16 = '6.55e4';

const VERTEX_SHADER =
  `#version 300 es
  layout(location=0) in vec4 vertex;
  void main() { gl_Position = vertex; }`;

const DOWNSAMPLE_SHADER =
  `#version 300 es
  precision highp float;
  const vec4 WEIGHTS = vec4(1.0, 3.0, 3.0, 1.0) / 8.0;
  uniform sampler2D source;
  uniform vec2 source_delta_uv;
  layout(location=0) out vec4 frag_color;
  void main() { 
    vec2 ij = floor(gl_FragCoord.xy);
    vec2 source_ij = ij * 2.0 - vec2(1.5);
    vec2 source_uv = source_ij * source_delta_uv;
    vec3 color = vec3(0.0);
    for (int i = 0; i < 4; ++i) {
      float wi = WEIGHTS[i];
      for (int j = 0; j < 4; ++j) {
        float wj = WEIGHTS[j];
        vec2 delta_uv = vec2(i, j) * source_delta_uv;
        color += wi * wj * texture(source, source_uv + delta_uv).rgb;
      }
    }
    frag_color = vec4(min(color, ${MAX_FLOAT16}), 1.0);
  }`;

const BLOOM_SHADER =
  `#version 300 es
  precision highp float;
  uniform sampler2D source;
  uniform vec2 source_delta_uv;
  uniform vec3 source_samples_uvw[SIZE];
  layout(location=0) out vec4 frag_color;
  void main() { 
    vec2 source_uv = (gl_FragCoord.xy + vec2(1.0)) * source_delta_uv;
    vec3 color = vec3(0.0);
    for (int i = 0; i < SIZE; ++i) {
      vec3 uvw = source_samples_uvw[i];
      color += uvw.z * texture(source, source_uv + uvw.xy).rgb;
    }
    frag_color = vec4(min(color, ${MAX_FLOAT16}), 1.0);
  }`;

const UPSAMPLE_SHADER =
  `#version 300 es
  precision highp float;
  const vec4 WEIGHTS[4] = vec4[4] (
    vec4(1.0, 3.0, 3.0, 9.0) / 16.0,
    vec4(3.0, 1.0, 9.0, 3.0) / 16.0,
    vec4(3.0, 9.0, 1.0, 3.0) / 16.0,
    vec4(9.0, 3.0, 3.0, 1.0) / 16.0
  );
  uniform sampler2D source;
  uniform vec2 source_delta_uv;
  layout(location=0) out vec4 frag_color;
  void main() {
    vec2 ij = floor(gl_FragCoord.xy);
    vec2 source_ij = floor((ij - vec2(1.0)) * 0.5) + vec2(0.5);
    vec2 source_uv = source_ij * source_delta_uv;
    vec3 c0 = texture(source, source_uv).rgb;
    vec3 c1 = texture(source, source_uv + vec2(source_delta_uv.x, 0.0)).rgb;
    vec3 c2 = texture(source, source_uv + vec2(0.0, source_delta_uv.y)).rgb;
    vec3 c3 = texture(source, source_uv + source_delta_uv).rgb;
    vec4 weight = WEIGHTS[int(mod(ij.x, 2.0) + 2.0 * mod(ij.y, 2.0))];
    vec3 color = weight.x * c0 + weight.y * c1 + weight.z * c2 + weight.w * c3;
    frag_color = vec4(min(color, ${MAX_FLOAT16}), 1.0);
  }`;

const RENDER_SHADER =
  `#version 300 es
  precision highp float;
  uniform sampler2D source;
  uniform vec2 source_delta_uv;
  uniform vec3 source_samples_uvw[SIZE];
  uniform sampler2D bloom;
  uniform vec2 bloom_delta_uv;
  uniform float intensity;
  uniform float exposure;
  uniform bool high_contrast;
  layout(location=0) out vec4 frag_color;

  vec3 toneMap(vec3 color) {
    return pow(vec3(1.0) - exp(-color), vec3(1.0 / 2.2));
  }
  
  // ACES tone map, see
  // https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
  vec3 toneMapACES(vec3 color) {
    const float A = 2.51;
    const float B = 0.03;
    const float C = 2.43;
    const float D = 0.59;
    const float E = 0.14;
    color = (color * (A * color + B)) / (color * (C * color + D) + E);
    return pow(color, vec3(1.0 / 2.2));
  }

  void main() {
    vec2 source_uv = (gl_FragCoord.xy + vec2(1.0)) * source_delta_uv;
    vec3 color = texture(bloom, 0.5 * gl_FragCoord.xy * bloom_delta_uv).rgb;
    for (int i = 0; i < SIZE; ++i) {
      vec3 uvw = source_samples_uvw[i];
      color += uvw.z * texture(source, source_uv + uvw.xy).rgb;
    }
    color = mix(texture(source, source_uv).rgb, color, intensity) * exposure;
    color = min(color, 10.0);
    if (high_contrast) {
      color = toneMapACES(color);
    } else {
      color = toneMap(color);
    }
    frag_color = vec4(color, 1.0);
  }`;

const createShader = function(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
};

const createTexture = function(gl, textureUnit, target) {
  const texture = gl.createTexture();
  gl.activeTexture(textureUnit);
  gl.bindTexture(target, texture);
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
};

// Usage: create an instance for the desired viewport size, and draw your scene
// between a call to begin() and a call to end(). Use resize() when the viewport
// size changes.
class Bloom {

  constructor(gl, width, height) {
    this.gl = gl;
    this.width = width;
    this.height = height;
    gl.getExtension('OES_texture_float_linear');
    gl.getExtension('EXT_color_buffer_float');
    gl.getExtension('EXT_float_blend');

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,
       new Float32Array([-1, -1, +1, -1, -1, +1, +1, +1]), gl.STATIC_DRAW);

    const vertexShader = 
        createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);

    this.downsampleProgram = gl.createProgram();
    gl.attachShader(this.downsampleProgram, vertexShader);
    gl.attachShader(this.downsampleProgram, 
        createShader(gl, gl.FRAGMENT_SHADER, DOWNSAMPLE_SHADER));
    gl.linkProgram(this.downsampleProgram);
    gl.useProgram(this.downsampleProgram);
    gl.uniform1i(gl.getUniformLocation(this.downsampleProgram, 'source'), 0);
    this.downsampleProgram.sourceDeltaUvUniform = 
        gl.getUniformLocation(this.downsampleProgram, 'source_delta_uv');

    this.bloomProgram = gl.createProgram();
    gl.attachShader(this.bloomProgram, vertexShader);
    gl.attachShader(this.bloomProgram, 
        createShader(gl, gl.FRAGMENT_SHADER, 
            BLOOM_SHADER.replace(/SIZE/g, 25)));
    gl.linkProgram(this.bloomProgram);
    gl.useProgram(this.bloomProgram);
    gl.uniform1i(gl.getUniformLocation(this.bloomProgram, 'source'), 0);
    this.bloomProgram.sourceDeltaUvUniform = 
        gl.getUniformLocation(this.bloomProgram, 'source_delta_uv');

    this.upsampleProgram = gl.createProgram();
    gl.attachShader(this.upsampleProgram, vertexShader);
    gl.attachShader(this.upsampleProgram, 
        createShader(gl, gl.FRAGMENT_SHADER, UPSAMPLE_SHADER));
    gl.linkProgram(this.upsampleProgram);
    gl.useProgram(this.upsampleProgram);
    gl.uniform1i(gl.getUniformLocation(this.upsampleProgram, 'source'), 0);
    this.upsampleProgram.sourceDeltaUvUniform = 
        gl.getUniformLocation(this.upsampleProgram, 'source_delta_uv');

    this.renderProgram = gl.createProgram();
    gl.attachShader(this.renderProgram, vertexShader);
    gl.attachShader(this.renderProgram, 
        createShader(gl, gl.FRAGMENT_SHADER, 
            RENDER_SHADER.replace(/SIZE/g, 25)));
    gl.linkProgram(this.renderProgram);
    gl.useProgram(this.renderProgram);
    gl.uniform1i(gl.getUniformLocation(this.renderProgram, 'source'), 0);
    gl.uniform1i(gl.getUniformLocation(this.renderProgram, 'bloom'), 1);
    this.renderProgram.intensityUniform = 
        gl.getUniformLocation(this.renderProgram, 'intensity');
    this.renderProgram.exposureUniform = 
        gl.getUniformLocation(this.renderProgram, 'exposure');
    this.renderProgram.highContrastUniform = 
        gl.getUniformLocation(this.renderProgram, 'high_contrast');
    this.renderProgram.sourceDeltaUvUniform = 
        gl.getUniformLocation(this.renderProgram, 'source_delta_uv');
    this.renderProgram.bloomDeltaUvUniform = 
        gl.getUniformLocation(this.renderProgram, 'bloom_delta_uv'); 

    this.numLevels = 0;
    this.mipmapTextures = [];
    this.filterTextures = [];
    this.bloomFilters = [];
    for (let i = 0; i < MAX_LEVELS; ++i) {
      const mipmapTexture = createTexture(gl, gl.TEXTURE0, gl.TEXTURE_2D);
      this.mipmapTextures.push(mipmapTexture);
      if (i > 0) {
        const filterTexture = createTexture(gl, gl.TEXTURE0, gl.TEXTURE_2D);
        if (i == 1) {
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }
        this.filterTextures.push(filterTexture);
      } else {
        this.filterTextures.push(null);
      }
    }

    this.mipmapFbos = [];
    this.filterFbos = [];
    this.depthBuffer = undefined;
    for (let i = 0; i < MAX_LEVELS; ++i) {
      const mipmapFbo = gl.createFramebuffer();
      this.mipmapFbos.push(mipmapFbo);
      gl.bindFramebuffer(gl.FRAMEBUFFER, mipmapFbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
          gl.TEXTURE_2D, this.mipmapTextures[i], 0);
      if (i > 0) {
        const filterFbo = gl.createFramebuffer();
        this.filterFbos.push(filterFbo);
        gl.bindFramebuffer(gl.FRAMEBUFFER, filterFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 
            gl.TEXTURE_2D, this.filterTextures[i], 0);
      } else {
        this.depthBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
            this.mipmapTextures[0].width, this.mipmapTextures[0].height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
            gl.RENDERBUFFER, this.depthBuffer);
        this.filterFbos.push(null);
      }
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.resize(width, height);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;

    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);
    let level = 0;
    let w = width;
    let h = height;
    while (h > 2 && level < MAX_LEVELS) {
      gl.bindTexture(gl.TEXTURE_2D, this.mipmapTextures[level]);
      gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA16F, w + 2, h + 2, 0, gl.RGBA, gl.FLOAT, 
          null);
      this.mipmapTextures[level].width = w + 2;
      this.mipmapTextures[level].height = h + 2;
      if (level > 0) {
        gl.bindTexture(gl.TEXTURE_2D, this.filterTextures[level]);
        gl.texImage2D(
           gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.FLOAT, null);
        this.filterTextures[level].width = w;
        this.filterTextures[level].height = h;
      } else {
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
            this.mipmapTextures[0].width, this.mipmapTextures[0].height);
      }
      level += 1;
      w = Math.ceil(w / 2);
      h = Math.ceil(h / 2);
    }
    this.numLevels = level;

    let nearest_size_index = 0;
    let nearest_size = BLOOM_FILTERS[nearest_size_index];
    for (let i = 2; i < BLOOM_FILTERS.length; i += 2) {
      const size = BLOOM_FILTERS[i]
      if (Math.abs(BLOOM_FILTERS[i] - height) < 
          Math.abs(nearest_size - height)) {
        nearest_size_index = i;
        nearest_size = BLOOM_FILTERS[i];
      }
    }

    const filters = BLOOM_FILTERS[nearest_size_index + 1];
    for (let i = 0; i < this.numLevels; ++i) {
      const bloomFilter = [];
      const width = this.mipmapTextures[i].width;
      const height = this.mipmapTextures[i].height;
      for (let y = -2; y <= 2; ++y) {
        const iy = Math.abs(y);
        for (let x = -2; x <= 2; ++x) {
          const ix = Math.abs(x);
          const index = 
              ix < iy ? (iy * (iy + 1)) / 2 + ix : (ix * (ix + 1)) / 2 + iy;
          const w = filters[i][index];
          bloomFilter.push([x / width, y / height, w]);
        }
      }
      this.bloomFilters.push(bloomFilter);
    }
  }

  begin() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.mipmapFbos[0]);
    gl.viewport(1, 1, this.mipmapTextures[0].width - 2, 
        this.mipmapTextures[0].height - 2);
  }

  end(intensity, exposure, highContrast) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0);

    let program = this.downsampleProgram;
    gl.useProgram(program);
    for (let level = 1; level < this.numLevels; ++level) {
      const targetTexture = this.mipmapTextures[level];
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.mipmapFbos[level]);
      gl.viewport(1, 1, targetTexture.width - 2, targetTexture.height - 2);
      gl.bindTexture(gl.TEXTURE_2D, this.mipmapTextures[level - 1]);
      gl.uniform2f(program.sourceDeltaUvUniform, 
          1.0 / this.mipmapTextures[level - 1].width,
          1.0 / this.mipmapTextures[level - 1].height);
      this.drawQuad(program);
    }

    program = this.bloomProgram;
    gl.useProgram(program);
    for (let level = 1; level < this.numLevels; ++level) {
      const targetTexture = this.filterTextures[level];
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.filterFbos[level]);
      gl.viewport(0, 0, targetTexture.width, targetTexture.height);
      gl.bindTexture(gl.TEXTURE_2D, this.mipmapTextures[level]);
      gl.uniform2f(program.sourceDeltaUvUniform, 
          1.0 / this.mipmapTextures[level].width,
          1.0 / this.mipmapTextures[level].height);
      for (let i = 0; i < 25; ++i) {
        gl.uniform3f(gl.getUniformLocation(program, `source_samples_uvw[${i}]`),
            this.bloomFilters[level][i][0],
            this.bloomFilters[level][i][1], 
            this.bloomFilters[level][i][2]);
      }
      this.drawQuad(program);
    }

    program = this.upsampleProgram;
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(program);
    for (let level = this.numLevels - 2; level >= 1; --level) {
      const targetTexture = this.filterTextures[level];
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.filterFbos[level]);
      gl.viewport(0, 0, targetTexture.width, targetTexture.height);
      gl.bindTexture(gl.TEXTURE_2D, this.filterTextures[level + 1]);
      gl.uniform2f(program.sourceDeltaUvUniform, 
          1.0 / this.filterTextures[level + 1].width,
          1.0 / this.filterTextures[level + 1].height);
      this.drawQuad(program);
    }
    gl.disable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);

    program = this.renderProgram;
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.mipmapTextures[0]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.filterTextures[1]);
    gl.uniform2f(program.sourceDeltaUvUniform, 
        1.0 / this.mipmapTextures[0].width, 
        1.0 / this.mipmapTextures[0].height);
    gl.uniform2f(program.bloomDeltaUvUniform, 
        1.0 / this.filterTextures[1].width,
        1.0 / this.filterTextures[1].height);
    if (this.numLevels > 0) {
      for (let i = 0; i < 25; ++i) {
        gl.uniform3f(gl.getUniformLocation(program, `source_samples_uvw[${i}]`),
            this.bloomFilters[0][i][0],
            this.bloomFilters[0][i][1], 
            this.bloomFilters[0][i][2]);
      }
    }
    gl.uniform1f(program.intensityUniform, intensity);
    gl.uniform1f(program.exposureUniform, exposure);
    gl.uniform1i(program.highContrastUniform, highContrast ? 1 : 0);
    this.drawQuad(program);
  }

  drawQuad(program) {
    const gl = this.gl;
    const vertexAttrib = gl.getAttribLocation(program, 'vertex');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(
        vertexAttrib,
        /*numComponents=*/ 2,
        /*type=*/ this.gl.FLOAT,
        /*normalize=*/ false,
        /*stride=*/ 0,
        /*offset=*/ 0);
    gl.enableVertexAttribArray(vertexAttrib);
    gl.drawArrays(gl.TRIANGLE_STRIP, /*offset=*/ 0, /*vertexCount=*/ 4);
  }
}
