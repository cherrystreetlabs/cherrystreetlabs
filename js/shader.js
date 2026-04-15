// Cherry Street Labs — Frosted Mesh Gradient
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

  // ── Fragment shader: soft frosted mesh gradient ──
  var fragSrc = [
    'precision highp float;',
    '',
    'uniform float u_time;',
    'uniform vec2 u_resolution;',
    '',
    '// Smooth hash for noise',
    'float hash(vec2 p) {',
    '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
    '}',
    '',
    '// Value noise with smooth interpolation',
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
    '// Soft FBM — few octaves, low frequency for large blobs',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.55;',
    '  vec2 shift = vec2(100.0);',
    '  mat2 rot = mat2(cos(0.4), sin(0.4), -sin(0.4), cos(0.4));',
    '  for (int i = 0; i < 4; i++) {',
    '    v += a * noise(p);',
    '    p = rot * p * 1.8 + shift;',
    '    a *= 0.45;',
    '  }',
    '  return v;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_resolution;',
    '  float t = u_time;',
    '',
    '  // ── Slow organic domain warping ──',
    '  vec2 q = vec2(',
    '    fbm(uv * 2.0 + vec2(0.0, 0.0) + t * 0.035),',
    '    fbm(uv * 2.0 + vec2(5.2, 1.3) + t * 0.028)',
    '  );',
    '',
    '  vec2 r = vec2(',
    '    fbm(uv * 2.0 + 3.0 * q + vec2(1.7, 9.2) + t * 0.018),',
    '    fbm(uv * 2.0 + 3.0 * q + vec2(8.3, 2.8) + t * 0.022)',
    '  );',
    '',
    '  float f = fbm(uv * 2.0 + 2.5 * r);',
    '',
    '  // ── Color palette ──',
    '  vec3 cream     = vec3(0.961, 0.949, 0.929);',  // #F5F2ED
    '  vec3 cherry    = vec3(0.769, 0.118, 0.227);',  // #C41E3A
    '  vec3 warmSand  = vec3(0.898, 0.867, 0.816);',  // #E5DDD0
    '  vec3 softPink  = vec3(0.941, 0.769, 0.816);',  // #F0C4D0
    '',
    '  // ── Blend zones from warped noise ──',
    '  float zone1 = smoothstep(0.30, 0.60, q.x + 0.08 * sin(t * 0.05));',
    '  float zone2 = smoothstep(0.35, 0.65, r.y + 0.06 * cos(t * 0.04));',
    '  float zone3 = smoothstep(0.40, 0.70, f);',
    '',
    '  // Start with cream base',
    '  vec3 color = cream;',
    '',
    '  // Blend in warm sand',
    '  color = mix(color, warmSand, zone1 * 0.7);',
    '',
    '  // Blend in soft pink',
    '  color = mix(color, softPink, zone2 * 0.4);',
    '',
    '  // Blend in cherry at low opacity (~25%)',
    '  color = mix(color, cherry, zone3 * 0.18 + zone1 * zone2 * 0.07);',
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
