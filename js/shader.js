// Cherry Street Labs — Interactive Liquid Glass Shader (WebGL)
// Option C: Mouse-reactive liquid distortion on warm cream
(function() {
  'use strict';
  const canvas = document.getElementById('heroShader');
  if (!canvas) return;

  let animId = null;
  let gl = null;
  let resLoc = null;
  let timeLoc = null;
  let mouseLoc = null;
  let startTime = performance.now() / 1000;

  // Mouse state — normalized 0-1, with smooth interpolation
  let mouseTarget = { x: -1.0, y: -1.0 };
  let mouseCurrent = { x: -1.0, y: -1.0 };
  let mouseActive = false;
  let mouseTimeout = null;
  const LERP_FACTOR = 0.06;

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

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseTarget.x = (e.clientX - rect.left) / rect.width;
    mouseTarget.y = 1.0 - (e.clientY - rect.top) / rect.height; // flip Y for GL
    mouseActive = true;
    clearTimeout(mouseTimeout);
    mouseTimeout = setTimeout(function() { mouseActive = false; }, 3000);
  }

  function onPointerLeave() {
    mouseActive = false;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      mouseTarget.x = (touch.clientX - rect.left) / rect.width;
      mouseTarget.y = 1.0 - (touch.clientY - rect.top) / rect.height;
      mouseActive = true;
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(function() { mouseActive = false; }, 3000);
    }
  }

  function onTouchEnd() {
    mouseActive = false;
  }

  function init() {
    gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) { canvas.style.display = 'none'; return; }

    resize();
    window.addEventListener('resize', resize);

    // Mouse / touch tracking
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseleave', onPointerLeave);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchend', onTouchEnd);

    const vs = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;

    // Interactive liquid glass shader
    const fs = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      // --- Noise functions ---
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float f = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          f += amp * noise(p);
          p *= 2.03;
          amp *= 0.49;
        }
        return f;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float aspect = u_resolution.x / u_resolution.y;
        vec2 p = vec2(uv.x * aspect, uv.y);
        float t = u_time;

        // --- Base: warm cream ---
        vec3 cream = vec3(0.961, 0.949, 0.929);       // #F5F2ED
        vec3 warmCream = vec3(1.0, 0.976, 0.941);     // #FFF9F0

        // Subtle ambient warmth — very gentle, always-on highlights
        float ambientNoise = fbm(p * 1.5 + t * 0.015);
        vec3 col = mix(cream, warmCream, ambientNoise * 0.35);

        // Gentle ambient warm spots that slowly drift
        float spot1 = smoothstep(0.55, 0.2, length(p - vec2(aspect * 0.3, 0.6) - 0.04 * vec2(sin(t * 0.03), cos(t * 0.025))));
        float spot2 = smoothstep(0.5, 0.15, length(p - vec2(aspect * 0.7, 0.35) - 0.03 * vec2(cos(t * 0.04), sin(t * 0.03))));
        vec3 warmTint = vec3(0.98, 0.94, 0.90);
        col = mix(col, warmTint, (spot1 + spot2) * 0.08);

        // --- Mouse-reactive liquid distortion ---
        // u_mouse is (-1,-1) when inactive, 0-1 range when active
        bool hasPointer = u_mouse.x >= 0.0;

        if (hasPointer) {
          vec2 mouseP = vec2(u_mouse.x * aspect, u_mouse.y);
          float dist = length(p - mouseP);

          // Liquid distortion radius and falloff
          float radius = 0.35;
          float influence = smoothstep(radius, 0.0, dist);

          // Organic liquid shape — warp the influence with noise
          float warpNoise = fbm(p * 3.0 + t * 0.08 + u_mouse * 2.0);
          influence *= (0.8 + 0.4 * warpNoise);

          // The "dip" effect — radial gradient simulating depth
          float dip = pow(influence, 1.8);

          // Cherry-red liquid color
          vec3 cherryDeep = vec3(0.769, 0.118, 0.227);   // #C41E3A
          vec3 cherryLight = vec3(0.88, 0.30, 0.38);     // lighter cherry edge
          vec3 cherryCol = mix(cherryLight, cherryDeep, pow(influence, 1.2));

          // Inner FBM detail for organic liquid texture within the dip
          float innerDetail = fbm(p * 5.0 + t * 0.12 + u_mouse * 3.0);
          cherryCol = mix(cherryCol, cherryCol * (0.85 + 0.3 * innerDetail), influence);

          // Subtle specular-like highlight on the dip edge (glass refraction feel)
          float edgeHighlight = smoothstep(0.12, 0.04, abs(dist - radius * 0.4));
          vec3 highlight = vec3(1.0, 0.98, 0.96);
          cherryCol = mix(cherryCol, highlight, edgeHighlight * 0.15 * influence);

          // Blend cherry distortion into base — 25% max intensity
          col = mix(col, cherryCol, dip * 0.25);

          // Subtle UV distortion around the mouse — liquid displacement
          vec2 dir = normalize(p - mouseP + 0.001);
          float displacement = influence * 0.015;
          vec2 distortedUV = uv + dir * displacement;

          // Re-derive ambient with distorted coords for refraction feel
          float distortedNoise = fbm(vec2(distortedUV.x * aspect, distortedUV.y) * 1.5 + t * 0.015);
          vec3 distortedBase = mix(cream, warmCream, distortedNoise * 0.35);
          col = mix(col, distortedBase, influence * 0.12);
        }

        // Subtle vignette
        float vig = 1.0 - 0.1 * pow(length(uv - 0.5) * 1.4, 2.0);
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
    mouseLoc = gl.getUniformLocation(prog, 'u_mouse');
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.uniform2f(mouseLoc, -1.0, -1.0);
    startTime = performance.now() / 1000;

    function frame() {
      // Smooth mouse interpolation — liquid lag
      if (mouseActive) {
        mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * LERP_FACTOR;
        mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * LERP_FACTOR;
      } else {
        // Fade out: lerp toward offscreen
        mouseCurrent.x += (-1.0 - mouseCurrent.x) * 0.03;
        mouseCurrent.y += (-1.0 - mouseCurrent.y) * 0.03;
      }

      gl.uniform1f(timeLoc, performance.now() / 1000 - startTime);
      gl.uniform2f(mouseLoc, mouseCurrent.x, mouseCurrent.y);
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
