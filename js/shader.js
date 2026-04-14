// Cherry Street Labs — Liquid Cherry Shader (WebGL)
// Option A: Dramatic flowing liquid cherry on cream
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

    // Liquid flow shader with noise-based distortion
    const fs = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;

      // FBM noise for liquid distortion
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float f = 0.0;
        f += 0.5000 * noise(p); p *= 2.02;
        f += 0.2500 * noise(p); p *= 2.03;
        f += 0.1250 * noise(p); p *= 2.01;
        f += 0.0625 * noise(p);
        return f / 0.9375;
      }

      float blob(vec2 uv, vec2 center, float radius, float t) {
        float d = length(uv - center) / radius;
        float n = fbm(center * 3.0 + t * 0.5) * 0.15;
        float w = smoothstep(1.0 + n, 0.1, d);
        return w;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float aspect = u_resolution.x / u_resolution.y;
        vec2 p = vec2(uv.x * aspect, uv.y);
        float t = u_time;

        // Base: warm cream
        vec3 col = vec3(0.97, 0.95, 0.91);

        // Large flowing cherry blob (primary visual element)
        vec2 cherryCenter = vec2(
          0.5 + 0.3 * sin(t * 0.08) + 0.1 * sin(t * 0.17),
          0.5 + 0.25 * cos(t * 0.06) + 0.1 * cos(t * 0.13)
        );
        float cherryFlow = blob(p, cherryCenter, 0.55, t);

        // Cherry color - rich and visible
        float cherryIntensity = cherryFlow * 0.7;
        col = mix(col, vec3(0.75, 0.12, 0.18), cherryIntensity);

        // Secondary cherry pool - slower, adds depth
        vec2 cherry2Center = vec2(
          0.65 + 0.2 * cos(t * 0.11 + 1.5),
          0.35 + 0.2 * sin(t * 0.09 + 0.8)
        );
        float cherry2 = blob(p, cherry2Center, 0.45, t * 0.8 + 10.0);
        col = mix(col, vec3(0.65, 0.10, 0.16), cherry2 * 0.5);

        // Warm sand highlight blob
        col += blob(p, vec2(0.3 + 0.15 * cos(t * 0.07), 0.7 + 0.1 * sin(t * 0.09)), 0.4, t * 0.5) * vec3(0.03, 0.025, 0.015);

        // Soft bright cream highlight
        col += blob(p, vec2(0.75 + 0.1 * sin(t * 0.14), 0.2 + 0.1 * cos(t * 0.11)), 0.35, t * 0.6) * vec3(0.04, 0.02, 0.01);

        // Very subtle vignette
        col *= 1.0 - 0.08 * dot(uv - 0.5, uv - 0.5) * 4.0;

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
