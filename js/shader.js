// Cherry Street Labs — Liquid Marble Shader
(function() {
  'use strict';

  var gl, canvas;
  var program;
  var uniforms = {};

  // ── Vertex shader ──
  var vertSrc = [
    'attribute vec2 a_position;',
    'void main() {',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
  ].join('\n');

  // ── Fragment shader: liquid marble with cherry veins ──
  var fragSrc = [
    'precision highp float;',
    '',
    'uniform float u_time;',
    'uniform vec2 u_resolution;',
    '',
    'float hash(vec2 p) {',
    '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
    '}',
    '',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);',
    '  float a = hash(i);',
    '  float b = hash(i + vec2(1.0, 0.0));',
    '  float c = hash(i + vec2(0.0, 1.0));',
    '  float d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
    '}',
    '',
    '// FBM — 6 octaves for finer marble detail',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  vec2 shift = vec2(100.0);',
    '  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));',
    '  for (int i = 0; i < 6; i++) {',
    '    v += a * noise(p);',
    '    p = rot * p * 2.0 + shift;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    '// Ridged FBM — creates thin vein-like structures',
    'float ridged(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.6;',
    '  vec2 shift = vec2(100.0);',
    '  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));',
    '  for (int i = 0; i < 6; i++) {',
    '    float n = 1.0 - abs(noise(p) * 2.0 - 1.0);',
    '    n = n * n;',
    '    v += a * n;',
    '    p = rot * p * 2.0 + shift;',
    '    a *= 0.5;',
    '  }',
    '  return v;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_resolution;',
    '  float t = u_time;',
    '',
    '  // ── Domain warping — faster motion (~10s cycles) ──',
    '  vec2 q = vec2(',
    '    fbm(uv * 3.0 + t * 0.07),',
    '    fbm(uv * 3.0 + vec2(5.2, 1.3) + t * 0.055)',
    '  );',
    '',
    '  vec2 r = vec2(',
    '    fbm(uv * 3.0 + 3.5 * q + vec2(1.7, 9.2) + t * 0.035),',
    '    fbm(uv * 3.0 + 3.5 * q + vec2(8.3, 2.8) + t * 0.04)',
    '  );',
    '',
    '  float f = fbm(uv * 3.0 + 3.0 * r);',
    '',
    '  // ── Marble veining on warped coordinates ──',
    '  float vein1 = ridged(uv * 3.5 + 2.5 * q + t * 0.06);',
    '  float vein2 = ridged(uv * 5.0 + 1.8 * r + vec2(3.7, 7.1) + t * 0.05);',
    '',
    '  // ── Color palette ──',
    '  vec3 cream     = vec3(0.961, 0.949, 0.929);',
    '  vec3 warmCream = vec3(0.930, 0.905, 0.870);',
    '  vec3 cherry    = vec3(0.769, 0.118, 0.227);',
    '  vec3 darkVein  = vec3(0.85, 0.82, 0.78);',
    '',
    '  // ── Cream base with subtle warmth variation ──',
    '  vec3 color = mix(cream, warmCream, smoothstep(0.3, 0.7, f) * 0.5);',
    '',
    '  // ── Subtle gray veins in the cream (like real marble) ──',
    '  float grayVein = smoothstep(0.48, 0.52, vein2);',
    '  grayVein *= (1.0 - smoothstep(0.52, 0.58, vein2));',
    '  color = mix(color, darkVein, grayVein * 0.35);',
    '',
    '  // ── Primary cherry veins — sharp, dramatic streaks ──',
    '  float cherryMask = smoothstep(0.62, 0.66, vein1);',
    '  cherryMask *= smoothstep(0.2, 0.5, r.x + 0.12 * sin(t * 0.1));',
    '  color = mix(color, cherry, cherryMask * 0.9);',
    '',
    '  // ── Secondary cherry veins — thinner, different flow ──',
    '  float thinVein = smoothstep(0.58, 0.61, vein2 * 0.65 + vein1 * 0.35);',
    '  thinVein *= (1.0 - cherryMask);',
    '  color = mix(color, cherry * 0.85, thinVein * 0.5);',
    '',
    '  // ── Subtle vignette ──',
    '  vec2 vc = uv - 0.5;',
    '  color *= 1.0 - dot(vc, vc) * 0.15;',
    '',
    '  // ── Anti-banding grain ──',
    '  color += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.008;',
    '',
    '  gl_FragColor = vec4(color, 1.0);',
    '}'
  ].join('\n');

  // ── Shader compilation ──
  function compileShader(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  function buildProgram(vSrc, fSrc) {
    var vert = compileShader(gl.VERTEX_SHADER, vSrc);
    if (!vert) return null;
    var frag = compileShader(gl.FRAGMENT_SHADER, fSrc);
    if (!frag) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.bindAttribLocation(prog, 0, 'a_position');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  }

  // ── Initialization ──
  function init() {
    canvas = document.getElementById('heroShader');
    if (!canvas) return;

    gl = canvas.getContext('webgl', { alpha: false });
    if (!gl) {
      canvas.style.background = '#F5F2ED';
      return;
    }

    program = buildProgram(vertSrc, fragSrc);
    if (!program) return;

    gl.useProgram(program);

    uniforms.time = gl.getUniformLocation(program, 'u_time');
    uniforms.resolution = gl.getUniformLocation(program, 'u_resolution');

    // Fullscreen quad
    var vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // ── Resize handler ──
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth * dpr;
      var h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Animation loop ──
    var startTime = performance.now();

    function frame() {
      resize();
      var t = (performance.now() - startTime) / 1000.0;

      gl.uniform1f(uniforms.time, t);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // ── Initialize ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 100);
    });
  } else {
    setTimeout(init, 100);
  }
})();
