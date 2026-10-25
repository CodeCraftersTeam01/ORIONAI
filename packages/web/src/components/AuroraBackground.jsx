import React, { useEffect, useRef } from 'react';

/**
 * AuroraBackground — High-Performance WebGL Aurora Shader (Ultra-Lightweight & Smooth)
 * Multi-harmonic undulating waves optimized for zero GPU stutter:
 * - Scaled internal render buffer with bilinear GPU filtering
 * - 60 FPS capped frame timing (protects ProMotion 120Hz displays from overheating)
 * - Optimized fast-algebraic rim curves (replaces heavy exp/pow transcendental calls)
 * - Automatic pause on background tab (Page Visibility API)
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
uniform vec2 u_resolution;

uniform float u_scale;
uniform float u_rotation;
uniform vec4 u_color1; // Electric Blue
uniform vec4 u_color2; // Radiant Cyan
uniform vec4 u_color3; // Deep Sapphire
uniform float u_distortion;
uniform float u_wave_strength;

out vec4 fragColor;

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

  // Wave Layer 1: Deep rolling oceanic swell
  float w1 = (sin(uv_orig.x * 2.8 + t * 0.75) * 0.16 + cos(uv_orig.x * 5.6 - t * 0.55 + 1.2) * 0.09) * u_wave_strength;
  float crest1 = 0.58 * u_wave_strength + w1 * (1.1 + u_distortion * 3.5);

  // Wave Layer 2: Main electric blue surging wave
  float w2 = (sin(uv_orig.x * 3.8 + t * 1.15 + 1.8) * 0.20 + cos(uv_orig.x * 7.4 - t * 0.90 + 2.4) * 0.10) * u_wave_strength;
  float crest2 = 0.46 * u_wave_strength + w2 * (1.2 + u_distortion * 4.2);

  // Wave Layer 3: Foreground luminous cyan rippling crest
  float w3 = (sin(uv_orig.x * 4.4 + t * 1.40 + 3.4) * 0.17 + cos(uv_orig.x * 8.8 - t * 1.05 + 0.8) * 0.08) * u_wave_strength;
  float crest3 = 0.36 * u_wave_strength + w3 * (1.1 + u_distortion * 3.6);

  // Fluid noise flow
  vec2 flow_uv = uv_orig * vec2(2.6, 3.8) + vec2(t * 0.28, -t * 0.14);
  float n1 = noise(flow_uv);
  float n2 = noise(flow_uv * 2.0 + vec2(-t * 0.35, t * 0.2));

  // Volumetric wave body masks (using 1.0 - smoothstep to ensure edge0 < edge1 across all GPU backends)
  float mask1 = 1.0 - smoothstep(crest1 - 0.08, crest1 + 0.28, uv_orig.y);
  float mask2 = 1.0 - smoothstep(crest2 - 0.06, crest2 + 0.24, uv_orig.y);
  float mask3 = 1.0 - smoothstep(crest3 - 0.05, crest3 + 0.18, uv_orig.y);

  // Highly optimized quadratic bell curve for soft glowing crest highlights (replaces expensive exp/pow)
  float d1 = clamp(1.0 - abs(uv_orig.y - crest1) * 9.5, 0.0, 1.0);
  float rim1 = d1 * d1 * 0.35;

  float d2 = clamp(1.0 - abs(uv_orig.y - crest2) * 10.5, 0.0, 1.0);
  float rim2 = d2 * d2 * 0.50;

  float d3 = clamp(1.0 - abs(uv_orig.y - crest3) * 12.5, 0.0, 1.0);
  float rim3 = d3 * d3 * 0.60;

  // Colors
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

  // Vertical falloff: soft dissolution only at the top 10% edge so surging waves never get cut off
  float top_falloff = 1.0 - smoothstep(0.90, 1.0, uv_orig.y);
  float total_alpha = clamp(max(max(mask1 * 0.75, mask2 * 0.90), mask3 * 0.95) + rim1 * 0.35 + rim2 * 0.50 + rim3 * 0.60, 0.0, 1.0);
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

export default function AuroraBackground({
  active = true,
  inChat = false,
  theme = 'dark',
  isVoiceCalling = false,
  audioLevel = 0,
}) {
  const canvasRef = useRef(null);
  const propsRef = useRef({ isVoiceCalling, audioLevel });
  useEffect(() => {
    propsRef.current = { isVoiceCalling, audioLevel };
  }, [isVoiceCalling, audioLevel]);

  const animStateRef = useRef({
    rafId: null,
    gl: null,
    program: null,
    locations: {},
    startTime: performance.now(),
    lastFrameTime: performance.now(),
    totalAnimationTime: 0,
    currentWaveStrength: 1.0,
    isRunning: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl = animStateRef.current.gl;
    if (!gl) {
      try {
        gl = canvas.getContext('webgl2', {
          alpha: true,
          antialias: false, // Disabled for huge speed boost since canvas has CSS blur & feathering
          depth: false,
          stencil: false,
          powerPreference: 'low-power', // Conserves battery and avoids GPU fan spinning
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

      const uniforms = [
        'u_time',
        'u_resolution',
        'u_scale',
        'u_rotation',
        'u_color1',
        'u_color2',
        'u_color3',
        'u_distortion',
        'u_wave_strength',
      ];
      const locations = {};
      uniforms.forEach((u) => {
        locations[u] = gl.getUniformLocation(program, u);
      });
      animStateRef.current.locations = locations;
    }

    // High performance resolution scaling:
    // Uses window resize listener with stable reference height (360px)
    // so the WebGL drawing buffer is NEVER reallocated or cleared during CSS view transitions!
    const handleResize = () => {
      if (!canvas || !gl) return;
      const w = window.innerWidth || canvas.clientWidth || 1000;
      const h = 560; // Expanded vertical headroom allowing high wave surges without clipping

      const scale = Math.min(1.0, 1000 / Math.max(w, 1));
      const targetW = Math.max(320, Math.round(w * scale));
      const targetH = Math.max(260, Math.round(h * scale));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        gl.viewport(0, 0, targetW, targetH);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const state = animStateRef.current;
    let stopTimeoutId = null;
    let lastFrameTimestamp = performance.now();
    const TARGET_FRAME_MS = 1000 / 60; // 60 FPS cap to prevent 120Hz display overload

    const render = (now) => {
      const elapsed = now - lastFrameTimestamp;
      if (elapsed < TARGET_FRAME_MS) {
        if (state.isRunning) {
          state.rafId = requestAnimationFrame(render);
        }
        return;
      }

      // Delta time capped to 50ms to prevent huge jumps when tab switches
      const delta = Math.min(elapsed / 1000, 0.05);
      lastFrameTimestamp = now;
      state.totalAnimationTime += delta * 0.52;

      gl.useProgram(state.program);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(state.locations.u_time, state.totalAnimationTime);
      gl.uniform2f(state.locations.u_resolution, canvas.width, canvas.height);

      const animTime = state.totalAnimationTime;
      const cycle1 = Math.sin(animTime * 0.38);
      const cycle2 = Math.sin(animTime * 0.24 + 1.4);
      const rawWave = 0.55 + 0.32 * cycle1 + 0.13 * cycle2;
      const waveIntensity = Math.min(Math.max(rawWave, 0.0), 1.0);

      // Smooth wave strength interpolation:
      // When quiet, rests calmly at 5% (0.05).
      // When speaking or shouting, surges dynamically up to 2.1x height!
      const { isVoiceCalling: calling, audioLevel: level } = propsRef.current;
      const boost = Math.min(2.05, Math.pow(Math.max(0, level || 0), 0.48) * 2.15);
      const targetStrength = calling ? 0.05 + boost : 1.0;
      const factor = targetStrength > state.currentWaveStrength ? 0.45 : 0.14;
      state.currentWaveStrength += (targetStrength - state.currentWaveStrength) * factor;
      gl.uniform1f(state.locations.u_wave_strength, state.currentWaveStrength);

      const currentScale = 0.35 + 0.12 * waveIntensity;
      const currentDistortion = 0.15 + 0.12 * waveIntensity;
      const currentRotation = 0.015 * Math.sin(animTime * 0.15);

      gl.uniform1f(state.locations.u_scale, currentScale);
      gl.uniform1f(state.locations.u_rotation, currentRotation);

      // Electric Blue rgb(0, 107, 255)
      gl.uniform4f(state.locations.u_color1, 0.0, 0.42, 1.0, 1.0);
      // Radiant Sky Cyan rgb(97, 224, 255)
      gl.uniform4f(state.locations.u_color2, 0.38, 0.88, 1.0, 1.0);
      // Deep Royal Sapphire rgb(0, 56, 224)
      gl.uniform4f(state.locations.u_color3, 0.0, 0.22, 0.88, 1.0);

      gl.uniform1f(state.locations.u_distortion, currentDistortion);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (state.isRunning) {
        state.rafId = requestAnimationFrame(render);
      }
    };

    // Pause animation when tab is inactive to free 100% CPU/GPU
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (state.rafId) {
          cancelAnimationFrame(state.rafId);
          state.rafId = null;
        }
        state.isRunning = false;
      } else if (active) {
        if (!state.isRunning) {
          state.isRunning = true;
          lastFrameTimestamp = performance.now();
          state.rafId = requestAnimationFrame(render);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (active) {
      if (!state.isRunning) {
        state.isRunning = true;
        lastFrameTimestamp = performance.now();
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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
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
      className={`tryliner-aurora-wrapper ${active ? 'visible' : 'hidden'} ${inChat ? 'in-chat' : 'in-home'} ${
        isVoiceCalling ? 'in-voice-call' : ''
      }`}
      aria-hidden="true"
    >
      {/* Full Bleed Canvas */}
      <canvas ref={canvasRef} className="tryliner-aurora-canvas" />

      {/* Radiant aura glow spread wide across the bottom horizon */}
      <div className="tryliner-aurora-bottom-boost" />

      {/* Soft feather gradient transition overlay fading into background */}
      <div className="tryliner-aurora-feather" />
    </div>
  );
}
