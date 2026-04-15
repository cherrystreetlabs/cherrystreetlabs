// Cherry Street Labs — Pure WebGL Rolling Shadows
// Replaces Shaders.com CDN dependency with self-contained WebGL
// MultiPointGradient + WaveDistortion + Bulge + Paper grain

(function () {
  'use strict';

  const VERT_SRC = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const FRAG_SRC = `
    precision highp float;

    uniform vec2  u_resolution;
    uniform float u_time;
    uniform vec2  u_mouse;      // normalized 0..1
    uniform float u_mouseActive; // 0..1 blend for cherry accent

    // --- Noise for paper grain ---
    float hash(vec2 p) {
      float h = dot(p, vec2(127.1, 311.7));
      return fract(sin(h) * 43758.5453123);
    }

    // --- Smooth blob (gaussian-ish radial falloff) ---
    vec3 blob(vec2 uv, vec2 center, vec3 color, float radius) {
      float d = distance(uv, center);
      float strength = exp(-d * d / (radius * radius));
      return color * strength;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      float aspect = u_resolution.x / u_resolution.y;

      // Aspect-corrected UV for distance calculations
      vec2 uvA = vec2(uv.x * aspect, uv.y);

      // --- WaveDistortion: subtle sine warp ---
      float angle = 203.0 * 3.14159 / 180.0;
      vec2 waveDir = vec2(cos(angle), sin(angle));
      float wavePhase = dot(uv, waveDir) * 2.8 + u_time * 0.3;
      vec2 waveOffset = vec2(sin(wavePhase) * 0.012, cos(wavePhase * 1.3) * 0.008);
      uv += waveOffset;

      // --- Bulge distortion at mouse ---
      vec2 mouseA = vec2(u_mouse.x * aspect, u_mouse.y);
      vec2 uvABulge = vec2(uv.x * aspect, uv.y);
      vec2 delta = uvABulge - mouseA;
      float dist = length(delta);
      float bulgeRadius = 0.35;
      float bulge = exp(-dist * dist / (bulgeRadius * bulgeRadius));
      uv -= delta * bulge * 0.06 * u_mouseActive;

      // Re-derive aspect-corrected UV after distortion
      uvA = vec2(uv.x * aspect, uv.y);

      // --- CSL Colors ---
      vec3 cream     = vec3(0.961, 0.949, 0.929);  // #F5F2ED
      vec3 sand      = vec3(0.831, 0.647, 0.455);  // #D4A574
      vec3 lightCream = vec3(0.910, 0.867, 0.816); // #E8DDD0
      vec3 cherry    = vec3(0.769, 0.118, 0.227);  // #C41E3A
      vec3 taupe     = vec3(0.788, 0.659, 0.549);  // #C9A88C

      // --- Blob positions (slow drift with time) ---
      vec2 p1 = vec2(0.16 * aspect, 0.38) + vec2(sin(u_time * 0.15) * 0.02, cos(u_time * 0.12) * 0.015);
      vec2 p2 = vec2(0.61 * aspect, 0.81) + vec2(cos(u_time * 0.13) * 0.018, sin(u_time * 0.17) * 0.02);
      vec2 p3 = vec2(0.82 * aspect, 0.45) + vec2(sin(u_time * 0.11 + 1.0) * 0.015, cos(u_time * 0.14 + 2.0) * 0.018);
      vec2 p4 = vec2(u_mouse.x * aspect, u_mouse.y);  // cherry follows mouse
      vec2 p5 = vec2(0.53 * aspect, 0.69) + vec2(cos(u_time * 0.16 + 3.0) * 0.02, sin(u_time * 0.10 + 1.5) * 0.015);

      // --- Accumulate blobs ---
      float r1 = 0.55;  // cream — large, dominant
      float r2 = 0.42;  // sand
      float r3 = 0.48;  // light cream
      float r4 = 0.38;  // cherry — mouse-following
      float r5 = 0.40;  // taupe

      // Start from cream base
      vec3 color = cream * 0.65;
      color += blob(uvA, p1, cream,      r1) * 0.45;
      color += blob(uvA, p2, sand,       r2) * 0.35;
      color += blob(uvA, p3, lightCream, r3) * 0.40;
      color += blob(uvA, p4, cherry,     r4) * 0.40 * u_mouseActive;
      color += blob(uvA, p5, taupe,      r5) * 0.30;

      // Soft clamp to keep it in warm range
      color = clamp(color, vec3(0.0), vec3(1.0));

      // --- Paper grain ---
      vec2 grainUV = gl_FragCoord.xy * 0.8;
      float grain = hash(grainUV + fract(u_time * 0.5)) * 2.0 - 1.0;
      color += grain * 0.035;

      // Final clamp
      color = clamp(color, vec3(0.0), vec3(1.0));

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  function createShaderProgram(gl, vertSrc, fragSrc) {
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertSrc);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
      return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragSrc);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
      return null;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  function initShader() {
    const canvas = document.getElementById('heroShader');
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) {
      canvas.style.background = '#F5F2ED';
      canvas.style.opacity = '1';
      return;
    }

    const program = createShaderProgram(gl, VERT_SRC, FRAG_SRC);
    if (!program) {
      canvas.style.background = '#F5F2ED';
      canvas.style.opacity = '1';
      return;
    }

    gl.useProgram(program);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1
    ]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uRes   = gl.getUniformLocation(program, 'u_resolution');
    const uTime  = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uMouseActive = gl.getUniformLocation(program, 'u_mouseActive');

    // State
    let mouseX = 0.445, mouseY = 0.282;  // default origin from original config
    let targetX = mouseX, targetY = mouseY;
    let mouseActiveTarget = 0.0;
    let mouseActive = 0.0;
    let lastMoveTime = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    resize();
    window.addEventListener('resize', resize);

    // Mouse tracking on the hero shader background
    const heroShaderBg = canvas.parentElement;

    heroShaderBg.addEventListener('mousemove', function (e) {
      const rect = canvas.getBoundingClientRect();
      targetX = (e.clientX - rect.left) / rect.width;
      targetY = 1.0 - (e.clientY - rect.top) / rect.height; // flip Y for GL
      mouseActiveTarget = 1.0;
      lastMoveTime = performance.now();
    });

    heroShaderBg.addEventListener('mouseleave', function () {
      mouseActiveTarget = 0.0;
    });

    // Touch support
    heroShaderBg.addEventListener('touchmove', function (e) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      targetX = (touch.clientX - rect.left) / rect.width;
      targetY = 1.0 - (touch.clientY - rect.top) / rect.height;
      mouseActiveTarget = 1.0;
      lastMoveTime = performance.now();
    }, { passive: true });

    heroShaderBg.addEventListener('touchend', function () {
      mouseActiveTarget = 0.0;
    });

    // Fade cherry out after idle
    const IDLE_FADE_MS = 3000;

    // Fade in canvas
    let fadeIn = 0;
    const startTime = performance.now();

    function render(now) {
      const t = (now - startTime) / 1000.0;

      // Smooth mouse lerp
      mouseX += (targetX - mouseX) * 0.04;
      mouseY += (targetY - mouseY) * 0.04;

      // Fade cherry out when idle
      if (now - lastMoveTime > IDLE_FADE_MS && mouseActiveTarget > 0) {
        mouseActiveTarget = 0.0;
      }
      mouseActive += (mouseActiveTarget - mouseActive) * 0.02;

      // Canvas fade in (1.5s ease)
      if (fadeIn < 1) {
        fadeIn = Math.min(1, t / 1.5);
        canvas.style.opacity = String(fadeIn);
      }

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uMouse, mouseX, mouseY);
      gl.uniform1f(uMouseActive, mouseActive);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShader);
  } else {
    initShader();
  }
})();
