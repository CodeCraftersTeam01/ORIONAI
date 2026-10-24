import React, { useEffect, useRef } from 'react';

/**
 * AuroraBackground — High-Fidelity WebGL Aurora Shader (Multi-Layered Undulating Waves)
 * Renders strong, dynamic rolling electric blue, sky cyan, and sapphire waves with luminous crest highlights.
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
uniform vec4 u_color1; // Electric Blue
uniform vec4 u_color2; // Radiant Cyan
uniform vec4 u_color3; // Deep Sapphire
uniform float u_proportion;
uniform float u_softness;
uniform float u_distortion;
uniform float u_swirl;

out vec4 fragColor;

#define TWO_PI 6.28318530718

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

void main() {
  vec2 uv_orig = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.85;

  // Enhanced Multi-Harmonic Rolling Wave Crests (Stronger & more pronounced wave motion)
  // Wave Layer 1: Deep rolling oceanic swell
  float w1_a = sin(uv_orig.x * 2.8 + t * 0.75) * 0.16;
  float w1_b = cos(uv_orig.x * 5.6 - t * 0.55 + 1.2) * 0.09;
  float crest1 = 0.58 + (w1_a + w1_b) * (1.1 + u_distortion * 3.5);

  // Wave Layer 2: Main electric blue surging wave
  float w2_a = sin(uv_orig.x * 3.8 + t * 1.15 + 1.8) * 0.20;
  float w2_b = cos(uv_orig.x * 7.4 - t * 0.90 + 2.4) * 0.10;
  float w2_c = sin(uv_orig.x * 12.0 + t * 1.45) * 0.045;
  float crest2 = 0.46 + (w2_a + w2_b + w2_c) * (1.2 + u_distortion * 4.2);

  // Wave Layer 3: Foreground luminous cyan rippling crest
  float w3_a = sin(uv_orig.x * 4.4 + t * 1.40 + 3.4) * 0.17;
  float w3_b = cos(uv_orig.x * 8.8 - t * 1.05 + 0.8) * 0.08;
  float crest3 = 0.36 + (w3_a + w3_b) * (1.1 + u_distortion * 3.6);

  // Organic fluid noise flow inside the wave bodies
  vec2 flow_uv = uv_orig * vec2(2.6, 3.8) + vec2(t * 0.28, -t * 0.14);
  float n1 = noise(flow_uv);
  float n2 = noise(flow_uv * 2.0 + vec2(-t * 0.35, t * 0.2));

  // Volumetric wave body masks (smooth yet distinct curvature)
  float mask1 = smoothstep(crest1 + 0.18, crest1 - 0.05, uv_orig.y);
  float mask2 = smoothstep(crest2 + 0.14, crest2 - 0.04, uv_orig.y);
  float mask3 = smoothstep(crest3 + 0.11, crest3 - 0.03, uv_orig.y);

  // Radiant luminous rim lighting on the crest peaks
  float rim1 = exp(-pow((uv_orig.y - crest1) / 0.065, 2.0)) * 0.45;
  float rim2 = exp(-pow((uv_orig.y - crest2) / 0.052, 2.0)) * 0.90;
  float rim3 = exp(-pow((uv_orig.y - crest3) / 0.040, 2.0)) * 1.15;

  // Coordinated color palette: Deep Sapphire, Electric Blue, Radiant Cyan, Luminous White-Cyan
  vec3 col_deep = u_color3.rgb * 0.90;
  vec3 col_mid  = u_color1.rgb * 1.15;
  vec3 col_cyan = u_color2.rgb * 1.30;
  vec3 col_rim  = vec3(0.55, 0.94, 1.0);

  // Composite multi-layered wave colors
  vec3 color = col_deep * mask1;
  color += col_mid * rim1;

  color = mix(color, col_mid * (0.82 + 0.38 * n1), mask2);
  color += col_cyan * rim2;

  color = mix(color, col_cyan * (0.88 + 0.28 * n2), mask3);
  color += col_rim * rim3;

  // Vertical falloff: soft natural fade toward the top of the canvas
  float top_falloff = smoothstep(0.96, 0.38, uv_orig.y);
  float total_alpha = clamp(max(max(mask1 * 0.75, mask2 * 0.95), mask3) + rim1 * 0.5 + rim2 * 0.8 + rim3, 0.0, 1.0);
  total_alpha *= top_falloff;

  fragColor = vec4(color, total_alpha);
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

  // Track active state with smooth WebGL render lifecycle
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

      // Full screen quad buffer
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
        'u_distortion',
        'u_swirl',
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
      state.totalAnimationTime += delta * 0.52; // Natural, fluid wave rhythm

      gl.useProgram(state.program);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.width;
      const h = canvas.height;

      gl.uniform1f(state.locations.u_time, state.totalAnimationTime);
      gl.uniform1f(state.locations.u_pixelRatio, dpr);
      gl.uniform2f(state.locations.u_resolution, w, h);

      // Organic dynamic wave modulation: cycles between graceful swells and cresting waves
      const animTime = state.totalAnimationTime;
      const cycle1 = Math.sin(animTime * 0.38);
      const cycle2 = Math.sin(animTime * 0.24 + 1.4);
      const rawWave = 0.55 + 0.32 * cycle1 + 0.13 * cycle2;
      const waveIntensity = Math.min(Math.max(rawWave, 0.0), 1.0);

      // Amplified wave parameters for prominent, undulating waves
      const currentScale = 0.35 + 0.12 * waveIntensity;
      const currentDistortion = 0.15 + 0.12 * waveIntensity;
      const currentSwirl = 0.08 + 0.06 * waveIntensity;
      const currentProportion = 0.50 + 0.08 * waveIntensity;
      const currentSoftness = 0.72;
      const currentRotation = 0.015 * Math.sin(animTime * 0.15);

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
      gl.uniform1f(state.locations.u_distortion, currentDistortion);
      gl.uniform1f(state.locations.u_swirl, currentSwirl);

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

      {/* Radiant aura glow spread wide across the bottom horizon */}
      <div className="tryliner-aurora-bottom-boost" />

      {/* Soft feather gradient transition overlay */}
      <div className="tryliner-aurora-feather" />
    </div>
  );
}
