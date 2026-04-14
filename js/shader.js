// Cherry Street Labs — Apple Vision Pro Mesh Gradient (WebGL)
// Option B: Flowing mesh gradient with cherry, sand, pink on cream
(function() {
  'use strict';
  const canvas = document.getElementById('heroShader');
  if (!canvas) return;

  let animId = null;
  let gl = null;
  let resLoc = null;
  let timeLoc = null;
  let startTime = performance.now() / 1000;

  function resize() {
    if (!gl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (resLoc) gl.uniform2f(resLoc, canvas.width, canvas.height);
  }

  function init() {
    gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) { canvas.style.display = 'none'; return; }

    resize();
    window.addEventListener('resize', resize);

    const vs = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;

    // Apple Vision Pro mesh gradient shader
    const fs = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;

      // Smooth hash for noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      // Value noise with smooth interpolation
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      // FBM with 5 octaves for rich organic distortion
      float fbm(vec2 p) {
        float f = 0.0;
        float amp = 0.5;
        float freq = 1.0;
        for (int i = 0; i < 5; i++) {
          f += amp * noise(p * freq);
          freq *= 2.03;
          amp *= 0.495;
        }
        return f;
      }

      // Warped FBM for more organic, flowing shapes
      float warpedFbm(vec2 p, float t) {
        vec2 q = vec2(
          fbm(p + vec2(0.0, 0.0) + 0.12 * t),
          fbm(p + vec2(5.2, 1.3) + 0.10 * t)
        );
        vec2 r = vec2(
          fbm(p + 4.0 * q + vec2(1.7, 9.2) + 0.08 * t),
          fbm(p + 4.0 * q + vec2(8.3, 2.8) + 0.06 * t)
        );
        return fbm(p + 3.5 * r);
      }

      // Soft metaball blob with noise-warped edges
      float blob(vec2 uv, vec2 center, float radius, float t, float seed) {
        vec2 warp = vec2(
          fbm(uv * 1.8 + seed + t * 0.04),
          fbm(uv * 1.8 + seed + 50.0 + t * 0.035)
        );
        vec2 warped = uv + warp * 0.18;
        float d = length(warped - center) / radius;
        return smoothstep(1.0, 0.0, d);
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float aspect = u_resolution.x / u_resolution.y;
        vec2 p = vec2(uv.x * aspect, uv.y);
        float t = u_time;

        // Base warm cream (#F5F2ED)
        vec3 cream = vec3(0.961, 0.949, 0.929);
        vec3 col = cream;

        // --- Blob 1: Primary cherry red (#C41E3A) — large, dominant ---
        vec2 c1 = vec2(
          aspect * 0.38 + 0.25 * sin(t * 0.055 + 0.0) + 0.1 * cos(t * 0.11),
          0.55 + 0.2 * cos(t * 0.045 + 0.5) + 0.08 * sin(t * 0.09)
        );
        float b1 = blob(p, c1, 0.65, t, 0.0);
        vec3 cherry1 = vec3(0.769, 0.118, 0.227);
        col = mix(col, cherry1, b1 * 0.40);

        // --- Blob 2: Deep cherry (#A0162E) — overlapping secondary ---
        vec2 c2 = vec2(
          aspect * 0.62 + 0.18 * cos(t * 0.065 + 2.0),
          0.40 + 0.22 * sin(t * 0.05 + 1.2)
        );
        float b2 = blob(p, c2, 0.58, t, 7.7);
        vec3 cherry2 = vec3(0.627, 0.086, 0.180);
        col = mix(col, cherry2, b2 * 0.35);

        // --- Blob 3: Warm sand (#E5DDD0) — balances warmth ---
        vec2 c3 = vec2(
          aspect * 0.28 + 0.2 * sin(t * 0.04 + 3.5),
          0.7 + 0.15 * cos(t * 0.055 + 1.8)
        );
        float b3 = blob(p, c3, 0.6, t, 15.3);
        vec3 sand = vec3(0.898, 0.867, 0.816);
        col = mix(col, sand, b3 * 0.45);

        // --- Blob 4: Soft pink (#F0C4D0) — adds vibrancy ---
        vec2 c4 = vec2(
          aspect * 0.72 + 0.15 * cos(t * 0.07 + 4.2),
          0.65 + 0.18 * sin(t * 0.048 + 2.5)
        );
        float b4 = blob(p, c4, 0.52, t, 23.1);
        vec3 pink = vec3(0.941, 0.769, 0.816);
        col = mix(col, pink, b4 * 0.40);

        // --- Blob 5: Cherry-pink blend — creates transitions ---
        vec2 c5 = vec2(
          aspect * 0.5 + 0.2 * sin(t * 0.038 + 5.7),
          0.30 + 0.2 * cos(t * 0.058 + 3.0)
        );
        float b5 = blob(p, c5, 0.55, t, 31.9);
        vec3 cherryPink = vec3(0.82, 0.22, 0.35);
        col = mix(col, cherryPink, b5 * 0.30);

        // --- Blob 6: Bright cream highlight (#FFF9F0) — luminous patches ---
        vec2 c6 = vec2(
          aspect * 0.45 + 0.12 * cos(t * 0.06 + 1.0),
          0.5 + 0.15 * sin(t * 0.042 + 4.5)
        );
        float b6 = blob(p, c6, 0.48, t, 40.5);
        vec3 brightCream = vec3(1.0, 0.976, 0.941);
        col = mix(col, brightCream, b6 * 0.25);

        // Global warped FBM overlay for organic color shifting
        float warp = warpedFbm(p * 0.8, t * 0.3);
        col = mix(col, col * (0.92 + 0.16 * warp), 0.5);

        // Subtle vignette — Apple-style softness at edges
        float vig = 1.0 - 0.12 * pow(length(uv - 0.5) * 1.4, 2.0);
        col *= vig;

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;

    function createShader(type, source) {
      const s = gl.createShader(type);
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    const vsShader = createShader(gl.VERTEX_SHADER, vs);
    const fsShader = createShader(gl.FRAGMENT_SHADER, fs);
    if (!vsShader || !fsShader) { canvas.style.display = 'none'; return; }

    const prog = gl.createProgram();
    gl.attachShader(prog, vsShader);
    gl.attachShader(prog, fsShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    resLoc = gl.getUniformLocation(prog, 'u_resolution');
    timeLoc = gl.getUniformLocation(prog, 'u_time');
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    startTime = performance.now() / 1000;

    function frame() {
      gl.uniform1f(timeLoc, performance.now() / 1000 - startTime);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // Start immediately
  init();

  // Expose for re-init if needed
  window.__heroshader = { init, resize, canvas };
})();
