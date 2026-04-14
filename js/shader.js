// Cherry Street Labs — Animated mesh gradient shader (WebGL)
(function() {
  const canvas = document.getElementById('heroShader');
  if (!canvas) return;

  const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
  if (!gl) return;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  // Vertex shader — full-screen quad
  const vsSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Fragment shader — animated 5-blob mesh gradient
  const fsSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform float u_time;

    vec3 blob(vec2 uv, vec2 center, float radius, vec3 color, float t) {
      float d = length(uv - center) / radius;
      float g = smoothstep(1.0, 0.2, d);
      return g * color;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;
      // Normalize to 0-1 square
      float aspect = u_resolution.x / u_resolution.y;
      vec2 p = vec2(uv.x * aspect, uv.y);

      // Base cream (warm off-white)
      vec3 col = vec3(0.97, 0.95, 0.92);

      // Blob definitions with smooth animation
      float t = u_time;

      col += blob(p, vec2(0.5 + 0.2 * sin(t * 0.15), 0.6 + 0.15 * cos(t * 0.12)), 0.8, vec3(0.02, 0.015, 0.01), t);

      // Rose blob (subtle cherry red)
      col += blob(p, vec2(0.35 + 0.25 * sin(t * 0.13), 0.4 + 0.2 * cos(t * 0.17)), 0.7, vec3(0.12, 0.04, 0.035), t);

      // Warm sand blob
      col += blob(p, vec2(0.7 + 0.15 * cos(t * 0.11), 0.3 + 0.18 * sin(t * 0.14)), 0.6, vec3(0.06, 0.05, 0.02), t);

      // Cherry accent blob (smaller, more dynamic)
      col += blob(p, vec2(0.6 + 0.2 * sin(t * 0.18 + 1.0), 0.7 + 0.15 * cos(t * 0.22 + 0.5)), 0.4, vec3(0.15, 0.02, 0.025), t);

      // Warm highlight
      col += blob(p, vec2(0.4 + 0.1 * sin(t * 0.09), 0.8 + 0.1 * cos(t * 0.11)), 0.5, vec3(0.05, 0.03, 0.01), t);

      // Subtle vignette to keep focus on center
      float vignette = 1.0 - 0.15 * length(uv - vec2(0.5));
      col *= vignette;

      // Clamp and output
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

  const vs = createShader(gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  // Full-screen quad
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const resLoc = gl.getUniformLocation(prog, 'u_resolution');
  const timeLoc = gl.getUniformLocation(prog, 'u_time');
  const startTime = performance.now() / 1000;

  function frame() {
    gl.uniform2f(resLoc, canvas.width, canvas.height);
    gl.uniform1f(timeLoc, (performance.now() / 1000) - startTime);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
