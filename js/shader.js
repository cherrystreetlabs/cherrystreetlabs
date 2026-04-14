// Cherry Street Labs — Liquid Cherry & Beige Flow Shader
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

  // ── Fragment shader: liquid cherry & cream flow ──
  var fragSrc = [
    'precision highp float;',
    '',
    'uniform float u_time;',
    'uniform vec2 u_resolution;',
    '',
    '// Value noise',
    'float hash(vec2 p) {',
    '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
    '}',
    '',
    'float noise(vec2 p) {',
    '  vec2 i = floor(p);',
    '  vec2 f = fract(p);',
    '  f = f * f * (3.0 - 2.0 * f);',
    '  float a = hash(i);',
    '  float b = hash(i + vec2(1.0, 0.0));',
    '  float c = hash(i + vec2(0.0, 1.0));',
    '  float d = hash(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
    '}',
    '',
    '// FBM — 5 octaves with rotation for organic feel',
    'float fbm(vec2 p) {',
    '  float v = 0.0;',
    '  float a = 0.5;',
    '  vec2 shift = vec2(100.0);',
    '  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));',
    '  for (int i = 0; i < 5; i++) {',
    '    v += a * noise(p);',
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
    '  // === Domain warping: warp the warp for liquid folding ===',
    '',
    '  // First warp layer — slow organic drift',
    '  vec2 q = vec2(',
    '    fbm(uv * 3.0 + vec2(0.0, 0.0) + t * 0.03),',
    '    fbm(uv * 3.0 + vec2(5.2, 1.3) + t * 0.02)',
    '  );',
    '',
    '  // Second warp layer — fold the first warp into itself',
    '  vec2 r = vec2(',
    '    fbm(uv * 3.0 + 4.0 * q + vec2(1.7, 9.2) + t * 0.015),',
    '    fbm(uv * 3.0 + 4.0 * q + vec2(8.3, 2.8) + t * 0.02)',
    '  );',
    '',
    '  // Final FBM value from double-warped coordinates',
    '  float f = fbm(uv * 3.0 + 3.5 * r);',
    '',
    '  // === Color palette: only cherry and cream ===',
    '  vec3 cream  = vec3(0.96, 0.95, 0.92);',
    '  vec3 cherry = vec3(0.77, 0.12, 0.23);',
    '',
    '  // Build the liquid blend from the warped noise layers',
    '  // q-based mask: broad flowing regions of cherry',
    '  float mask1 = smoothstep(0.35, 0.65, q.x + 0.1 * sin(t * 0.08));',
    '',
    '  // r-based mask: secondary folds where colors meet',
    '  float mask2 = smoothstep(0.40, 0.70, r.y + 0.08 * cos(t * 0.06));',
    '',
    '  // f-based mask: fine detail at convergence points',
    '  float mask3 = smoothstep(0.50, 0.75, f);',
    '',
    '  // Combine masks — cherry is ~20-30% visible, flowing',
    '  float cherryAmount = mask1 * 0.22 + mask2 * 0.14 + mask3 * 0.08;',
    '',
    '  // Smooth blend between cream and cherry',
    '  vec3 color = mix(cream, cherry, cherryAmount);',
    '',
    '  // Subtle vignette for depth',
    '  vec2 vc = uv - 0.5;',
    '  float vignette = 1.0 - dot(vc, vc) * 0.3;',
    '  color *= vignette;',
    '',
    '  // Very subtle grain to prevent banding',
    '  float grain = (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.006;',
    '  color += grain;',
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

  function buildProgram(vertSrc, fragSrc) {
    var vert = compileShader(gl.VERTEX_SHADER, vertSrc);
    if (!vert) return null;
    var frag = compileShader(gl.FRAGMENT_SHADER, fragSrc);
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

    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
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

    // Resize handler
    function resize() {
      var dpr = window.devicePixelRatio || 1;
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

    // Animation loop
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
