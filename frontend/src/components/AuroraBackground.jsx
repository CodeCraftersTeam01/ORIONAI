import React, { useEffect, useRef } from 'react';

/**
 * AuroraBackground — High-Fidelity WebGL Aurora Shader (Liner / tryliner.fun Style)
 * Renders dynamic, undulating electric blue & sky cyan aurora mesh.
 * Smoothly fades out when active === false (when chat has messages).
 */

const VERTEX_SHADER_SRC = `#version 300 es
layout(location = 0) in vec4 a_position;
void main() {
  gl_Position = a_position;
}
`;

const FRAGMENT_SHADER_SRC = `#version 300 es
precision highp float;

uniform float u_time;
uniform float u_pixelRatio;
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_rotation;
uniform vec4 u_color1;
uniform vec4 u_color2;
uniform vec4 u_color3;
uniform float u_proportion;
uniform float u_softness;
uniform float u_shape;
uniform float u_shapeScale;
uniform float u_distortion;
uniform float u_swirl;
uniform float u_swirlIterations;

out vec4 fragColor;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

vec4 blend_colors(vec4 c1, vec4 c2, vec4 c3, float mixer, float edgesWidth, float edge_blur) {
  float r1 = smoothstep(0.0 + 0.35 * edgesWidth, 0.7 - 0.35 * edgesWidth + 0.5 * edge_blur, mixer);
  float r2 = smoothstep(0.3 + 0.35 * edgesWidth, 1.0 - 0.35 * edgesWidth + edge_blur, mixer);

  vec3 blended_color_2 = mix(c1.rgb, c2.rgb, r1);
  float blended_opacity_2 = mix(c1.a, c2.a, r1);

  vec3 c = mix(blended_color_2, c3.rgb, r2);
  float o = mix(blended_opacity_2, c3.a, r2);
  return vec4(c, o);
}

void main() {
  vec2 uv_orig = gl_FragCoord.xy / u_resolution.xy;
  vec2 uv = uv_orig;
  float t = 0.5 * u_time;
  float noise_scale = 0.0005 + 0.006 * u_scale;

  uv -= 0.5;
  uv *= (noise_scale * u_resolution);
  uv = rotate(uv, u_rotation * 0.5 * PI);
  uv /= u_pixelRatio;
  uv += 0.5;

  // Ultra-gentle horizontal wave flow (no jagged or cut-off peaks)
  float wave_phase = uv_orig.x * 3.2 + t * 0.6;
  float wave_swell = sin(wave_phase) * 0.06 * u_distortion;

  float n1 = noise(uv * 0.75 + t * 0.4);
  float n2 = noise(uv * 1.3 - t * 0.4);
  float angle = n1 * TWO_PI;
  uv.x += 1.5 * u_distortion * n2 * cos(angle);
  uv.y += 1.5 * u_distortion * n2 * sin(angle) + wave_swell;

  int iterations = int(clamp(u_swirlIterations, 1.0, 5.0));
  for (int i = 1; i <= 5; i++) {
    if (i > iterations) break;
    float fi = float(i);
    uv.x += clamp(u_swirl, 0.0, 0.5) / fi * cos(t + fi * 1.2 * uv.y);
    uv.y += clamp(u_swirl, 0.0, 0.5) / fi * cos(t + fi * 0.8 * uv.x);
  }

  float proportion = clamp(u_proportion, 0.0, 1.0);

  float shape = 0.0;
  float mixer = 0.0;
  if (u_shape < 0.5) {
    vec2 checks_shape_uv = uv * (0.5 + 3.5 * u_shapeScale);
    shape = 0.5 + 0.5 * sin(checks_shape_uv.x) * cos(checks_shape_uv.y);
    mixer = shape + 0.48 * sign(proportion - 0.5) * pow(abs(proportion - 0.5), 0.5);
  } else if (u_shape < 1.5) {
    vec2 stripes_shape_uv = uv * (0.25 + 3.0 * u_shapeScale);
    float f = fract(stripes_shape_uv.y);
    shape = smoothstep(0.0, 0.55, f) * smoothstep(1.0, 0.45, f);
    mixer = shape + 0.48 * sign(proportion - 0.5) * pow(abs(proportion - 0.5), 0.5);
  } else {
    // Harmonic rolling wave crest with noticeable elegant swells
    float wave1 = sin(uv_orig.x * 3.5 + t * 0.8) * 0.095;
    float wave2 = cos(uv_orig.x * 6.2 - t * 0.5) * 0.048;
    float wave3 = sin(uv_orig.x * 1.9 + t * 0.35) * 0.06;
    float wave_crest = (wave1 + wave2 + wave3) * (1.0 + 0.6 * u_distortion * 10.0);

    // Wide, ultra-smooth gradient ramp following wave swells
    float sh = clamp(1.0 - (uv.y - wave_crest * 0.5), 0.0, 1.0);
    float shape_scaling = 0.35 * (1.0 - u_shapeScale);
    shape = smoothstep(0.15 - shape_scaling, 0.85 + shape_scaling, sh + 0.25 * (proportion - 0.5));
    mixer = shape;
  }

  vec4 color_mix = blend_colors(u_color1, u_color2, u_color3, mixer, 1.0 - clamp(u_softness, 0.0, 1.0), 0.01 + 0.01 * u_scale);

  // Undulating top wave horizon (strengthened slightly as requested)
  float w1 = sin(uv_orig.x * 3.5 + t * 0.8) * 0.095;
  float w2 = cos(uv_orig.x * 6.2 - t * 0.5) * 0.048;
  float w3 = sin(uv_orig.x * 1.9 + t * 0.35) * 0.06;
  float w_crest = (w1 + w2 + w3) * (1.0 + 0.6 * u_distortion * 10.0);

  float raw_fade = clamp(1.0 - (uv_orig.y - w_crest), 0.0, 1.0);
  float fade = smoothstep(0.04, 0.90, raw_fade);
  fragColor = vec4(color_mix.rgb, color_mix.a * fade);
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vsSrc, fsSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

export default function AuroraBackground({ active = true, theme = 'dark' }) {
  const canvasRef = useRef(null);
  const animStateRef = useRef({
    rafId: null,
    gl: null,
    program: null,
    locations: {},
    startTime: performance.now(),
    lastFrameTime: performance.now(),
    totalAnimationTime: 0,
    isRunning: false,
  });

  // Track active state with smooth transition
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl = animStateRef.current.gl;
    if (!gl) {
      try {
        gl = canvas.getContext('webgl2', {
          alpha: true,
          antialias: true,
          powerPreference: 'default',
          preserveDrawingBuffer: false,
        });
      } catch (err) {
        console.warn('WebGL2 not supported, fallback:', err);
      }

      if (!gl) return;
      animStateRef.current.gl = gl;

      const program = createProgram(gl, VERTEX_SHADER_SRC, FRAGMENT_SHADER_SRC);
      if (!program) return;
      animStateRef.current.program = program;

      // Position buffer
      const posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -1, -1,
           1, -1,
          -1,  1,
          -1,  1,
           1, -1,
           1,  1,
        ]),
        gl.STATIC_DRAW
      );

      const aPos = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // Enable WebGL alpha blending for true transparency
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0.0, 0.0, 0.0, 0.0);

      // Cache uniform locations
      const uniforms = [
        'u_time',
        'u_pixelRatio',
        'u_resolution',
        'u_scale',
        'u_rotation',
        'u_color1',
        'u_color2',
        'u_color3',
        'u_proportion',
        'u_softness',
        'u_shape',
        'u_shapeScale',
        'u_distortion',
        'u_swirl',
        'u_swirlIterations',
      ];
      const locations = {};
      uniforms.forEach((u) => {
        locations[u] = gl.getUniformLocation(program, u);
      });
      animStateRef.current.locations = locations;
    }

    const handleResize = () => {
      if (!canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        gl.viewport(0, 0, targetW, targetH);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);
    handleResize();

    // Start / Stop animation loop
    const state = animStateRef.current;
    let stopTimeoutId = null;

    const render = (now) => {
      const delta = (now - state.lastFrameTime) / 1000;
      state.lastFrameTime = now;
      state.totalAnimationTime += delta * 0.4; // smooth fluid speed

      gl.useProgram(state.program);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width;
      const h = canvas.height;

      gl.uniform1f(state.locations.u_time, state.totalAnimationTime);
      gl.uniform1f(state.locations.u_pixelRatio, dpr);
      gl.uniform2f(state.locations.u_resolution, w, h);

      // Organic alternating wave dynamics: cycles between tranquil calm waters and rolling dynamic waves
      const animTime = state.totalAnimationTime;
      const cycle1 = Math.sin(animTime * 0.35);
      const cycle2 = Math.sin(animTime * 0.22 + 1.2);
      // Normalized wave intensity: ~0.0 (calm smooth stream) to ~1.0 (crested undulating swells)
      const rawWave = 0.5 + 0.35 * cycle1 + 0.15 * cycle2;
      const waveIntensity = Math.min(Math.max(rawWave, 0.0), 1.0);

      // Dynamic wave motion (ombak dikuatkan sedikit lagi agar terlihat beralun hidup)
      const currentScale = 0.25 + 0.07 * waveIntensity;
      const currentDistortion = 0.07 + 0.065 * waveIntensity;
      const currentSwirl = 0.045 + 0.04 * waveIntensity;
      const currentProportion = 0.44 + 0.06 * waveIntensity;
      const currentSoftness = 0.84;
      // Horizontal flow across the full screen width
      const currentRotation = 0.0 + 0.018 * Math.sin(animTime * 0.12);

      gl.uniform1f(state.locations.u_scale, currentScale);
      gl.uniform1f(state.locations.u_rotation, currentRotation);

      // Vibrant Electric Blue rgb(0, 107, 255)
      gl.uniform4f(state.locations.u_color1, 0.0, 0.42, 1.0, 1.0);
      // Radiant Sky Cyan rgb(97, 224, 255)
      gl.uniform4f(state.locations.u_color2, 0.38, 0.88, 1.0, 1.0);
      // Deep Royal Sapphire rgb(0, 56, 224)
      gl.uniform4f(state.locations.u_color3, 0.0, 0.22, 0.88, 1.0);

      gl.uniform1f(state.locations.u_proportion, currentProportion);
      gl.uniform1f(state.locations.u_softness, currentSoftness);
      gl.uniform1f(state.locations.u_shape, 2.0); // Edge shape
      gl.uniform1f(state.locations.u_shapeScale, 0.5);
      gl.uniform1f(state.locations.u_distortion, currentDistortion);
      gl.uniform1f(state.locations.u_swirl, currentSwirl);
      gl.uniform1f(state.locations.u_swirlIterations, 3.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (state.isRunning) {
        state.rafId = requestAnimationFrame(render);
      }
    };

    if (active) {
      if (!state.isRunning) {
        state.isRunning = true;
        state.lastFrameTime = performance.now();
        state.rafId = requestAnimationFrame(render);
      }
    } else {
      // Allow CSS fade-out animation to finish (900ms), then pause render to save GPU
      stopTimeoutId = setTimeout(() => {
        state.isRunning = false;
        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
      }, 900);
    }

    return () => {
      resizeObserver.disconnect();
      if (stopTimeoutId) clearTimeout(stopTimeoutId);
      if (state.rafId) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
      state.isRunning = false;
    };
  }, [active, theme]);

  return (
    <div
      className={`tryliner-aurora-wrapper ${active ? 'visible' : 'hidden'}`}
      aria-hidden="true"
    >
      {/* Full Bleed Canvas */}
      <canvas ref={canvasRef} className="tryliner-aurora-canvas" />

      {/* Radiant aura glow matching the reference image */}
      <div className="tryliner-aurora-bottom-boost" />

      {/* Soft feather gradient transition overlay */}
      <div className="tryliner-aurora-feather" />
    </div>
  );
}
