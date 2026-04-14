// Cherry Street Labs — Shader Background (WebGL)
// Apple Vision Pro style mesh gradient with FBM domain warping
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
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    if (resLoc) gl.uniform2f(resLoc, css.width, canvas.height);
  }

  function init() {
    gl = canvas.getContext('webgl', { alpha: false, premultipliedAlpha: false });
    if (!gl) return;

    resize();
    window.addEventListener('resize', resize);

    const vs = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;

    // Apple Vision Pro style — large flowing mesh gradient with FBM warping
    const fs = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        vec3 i = floor(v + dot(v, C.y));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.y, x0.x);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - 0.5;
        i = mod289(i);
        vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        vec4 j = p - 49.0 * floor(p * (1.0 / 49.0));
        vec4 x_ = floor(j * (1.0 / 7.0));
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x2_ = (x_ * 2.0 + 0.5) / 7.0 - 1.0;
        vec4 y2_ = (y_ * 2.0 + 0.5) / 7.0 - 1.0;
        vec4 h = 1.0 - abs(x2_) - abs(y2_);
        vec4 b0 = vec4(x2_.xy, y2_.xy);
        vec4 b1 = vec4(x2_.zw, y2_.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = 1.79284291400159 - 0.85373472095314 *
          vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      vec4 fbm(vec3 p) {
        vec4 f = vec4(0.0);
        float amp = 0.5;
        float freq = 1.0;
        for (int i = 0; i < 5; i++) {
          f += amp * vec4(
            snoise(p * freq),
            snoise(p * freq + vec3(31.7, 17.3, 5.1)),
            snoise(p * freq + vec3(79.1, 123.8, 41.2)),
            1.0
          );
          freq *= 2.0;
          amp *= 0.5;
        }
        return f;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution;
        float aspect = u_resolution.x / u_resolution.y;
        vec3 p = vec3(uv.x * aspect, uv.y, u_time * 0.04);

        // Domain warping for organic flow
        vec4 q = fbm(p + vec3(0.0, 0.0, 0.0));
        vec2 r = vec2(
          fbm(p + vec3(q.x, q.y, 1.7) + vec3(0.3, 0.5, 1.3)).x,
          fbm(p + vec3(q.x, q.y, 2.3) + vec3(1.4, 0.9, 2.1)).y
        );

        float f = fbm(p + vec3(r, 0.0)).x;

        // Color palette — Apple Vision Pro style
        // Base: warm cream
        vec3 col = mix(
          vec3(0.97, 0.95, 0.91),   // cream (#F7F2E8)
          vec3(0.93, 0.90, 0.86),    // darker cream
          f
        );

        // Cherry red patches (prominent, visible)
        vec3 cherry = vec3(0.77, 0.12, 0.23);
        cherry += 0.08 * fbm(p + vec3(f * 0.5, 3.0)).y;
        float cherryMask = smoothstep(-0.1, 0.4, f * 0.8 + 0.15);
        col = mix(col, cherry, cherryMask * 0.45);

        // Warm sand patches
        vec3 sand = vec3(0.92, 0.85, 0.74);
        float sandMask = smoothstep(0.0, 0.5, -f * 0.5 + 0.2);
        col = mix(col, sand, sandMask * 0.5);

        // Soft pink patches
        vec3 pink = vec3(0.95, 0.78, 0.83);
        float pinkMask = smoothstep(-0.1, 0.35, q.x * 0.4 + 0.1);
        col = mix(col, pink, pinkMask * 0.35);

        // Cherry-pink blend (intermediate areas)
        vec3 cherryPink = vec3(0.72, 0.18, 0.28);
        float cpMask = smoothstep(0.2, 0.5, abs(r.x) * 0.5);
        col = mix(col, cherryPink, cpMask * 0.3);

        // Bright cream highlights (depth)
        vec3 highlight = vec3(0.99, 0.97, 0.94);
        float hlMask = smoothstep(0.2, 0.6, q.z * 0.3 + 0.3);
        col = mix(col, highlight, hlMask * 0.35);

        // Subtle vignette
        col *= 1.0 - 0.06 * dot(uv - 0.5, uv - 0.5) * 4.0;

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }
    `;

    const vsShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsShader, vs);
    gl.compileShader(vsShader);
    const fsShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsShader, fs);
    gl.compileShader(fsShader);

    const prog = gl.createProgram();
    gl.attachShader(prog, vsShader);
    gl.attachShader(prog, fsShader);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    resLoc = gl.getUniformLocation(prog, 'u_resolution');
    timeLoc = gl.getUniformLocation(prog, 'u_time');
    startTime = performance.now() / 1000;

    function frame() {
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, performance.now() / 1000 - startTime);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('DOMContentLoaded', function() {
    setTimeout(init, 100);
  });
})();
