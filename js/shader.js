// Cherry Street Labs — Creative Liquid Light Shader
(function() {
  'use strict';

  var gl, canvas;
  var program;
  var uniforms = {};

  // Mouse state
  var mouseTarget = { x: 0.5, y: 0.5 };
  var mouseCurrent = { x: 0.5, y: 0.5 };
  var mouseActiveTarget = 0.0;
  var mouseActiveCurrent = 0.0;

  // ── Vertex shader ──
  var vertSrc = [
    'attribute vec2 a_position;',
    'void main() {',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
  ].join('\n');

  // ── Fragment shader: liquid light with mouse refraction ──
  var fragSrc = [
    'precision highp float;',
    '',
    'uniform float u_time;',
    'uniform vec2 u_resolution;',
    'uniform vec2 u_mouse;',
    'uniform float u_mouseActive;',
    '',
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
    '  float aspect = u_resolution.x / u_resolution.y;',
    '',
    '  // ── Mouse setup ──',
    '  vec2 mouse = u_mouse;',
    '  vec2 toMouse = uv - mouse;',
    '  vec2 toMouseAR = vec2(toMouse.x * aspect, toMouse.y);',
    '  float dist = length(toMouseAR);',
    '  float mA = u_mouseActive;',
    '',
    '  // ── Liquid surface displacement from cursor ──',
    '  vec2 pushDir = normalize(toMouseAR + vec2(0.001));',
    '  float push = smoothstep(0.35, 0.0, dist) * mA * 0.06;',
    '  vec2 displaced = uv + vec2(pushDir.x / aspect, pushDir.y) * push;',
    '',
    '  // ── Domain warping: liquid cherry & cream flow ──',
    '  vec2 baseUV = displaced;',
    '',
    '  // First warp — slow organic drift',
    '  vec2 q = vec2(',
    '    fbm(baseUV * 3.0 + vec2(0.0, 0.0) + t * 0.04),',
    '    fbm(baseUV * 3.0 + vec2(5.2, 1.3) + t * 0.03)',
    '  );',
    '',
    '  // Mouse attracts the warp field toward cursor',
    '  vec2 warpPull = (mouse - uv) * mA * smoothstep(0.5, 0.0, dist) * 0.4;',
    '',
    '  // Second warp — fold with mouse influence',
    '  vec2 r = vec2(',
    '    fbm(baseUV * 3.0 + 4.0 * q + vec2(1.7, 9.2) + t * 0.02 + warpPull),',
    '    fbm(baseUV * 3.0 + 4.0 * q + vec2(8.3, 2.8) + t * 0.025 + warpPull)',
    '  );',
    '',
    '  float f = fbm(baseUV * 3.0 + 3.5 * r);',
    '',
    '  // ── Color palette ──',
    '  vec3 cream = vec3(0.96, 0.95, 0.92);',
    '  vec3 cherry = vec3(0.77, 0.12, 0.23);',
    '  vec3 deepCherry = vec3(0.58, 0.08, 0.16);',
    '  vec3 warmLight = vec3(1.0, 0.96, 0.93);',
    '',
    '  // ── Base cherry amount from warped noise ──',
    '  float mask1 = smoothstep(0.35, 0.65, q.x + 0.1 * sin(t * 0.08));',
    '  float mask2 = smoothstep(0.40, 0.70, r.y + 0.08 * cos(t * 0.06));',
    '  float mask3 = smoothstep(0.50, 0.75, f);',
    '  float cherryAmt = mask1 * 0.22 + mask2 * 0.14 + mask3 * 0.08;',
    '',
    '  // ── Mouse: cherry concentration ring around light ──',
    '  float ring = smoothstep(0.35, 0.12, dist) * smoothstep(0.03, 0.10, dist);',
    '  cherryAmt += ring * mA * 0.4;',
    '',
    '  // Deep cherry near cursor core',
    '  cherryAmt += smoothstep(0.12, 0.0, dist) * mA * 0.18;',
    '',
    '  // Blend base liquid color',
    '  vec3 color = mix(cream, cherry, clamp(cherryAmt, 0.0, 1.0));',
    '',
    '  // Deep cherry tint near cursor',
    '  color = mix(color, deepCherry, smoothstep(0.25, 0.05, dist) * mA * 0.15);',
    '',
    '  // ── Mouse: warm light highlight (refraction glow) ──',
    '  float glow = exp(-dist * dist * 18.0) * mA;',
    '  color = mix(color, warmLight, glow * 0.7);',
    '',
    '  // Soft outer halo',
    '  color += warmLight * exp(-dist * dist * 6.0) * mA * 0.08;',
    '',
    '  // ── Mouse: light rays emanating from cursor ──',
    '  float angle = atan(toMouseAR.y, toMouseAR.x);',
    '  float rays = pow(max(0.0, cos(angle * 3.0 - t * 0.3)), 40.0);',
    '  rays += pow(max(0.0, cos(angle * 2.0 + t * 0.2 + 1.5)), 28.0) * 0.5;',
    '  color += warmLight * rays * smoothstep(0.5, 0.02, dist) * mA * 0.12;',
    '',
    '  // ── Mouse: refraction caustics ──',
    '  float c1 = noise(uv * 15.0 + t * 1.5 + mouse * 3.0);',
    '  float c2 = noise(uv * 22.0 - t * 1.2 + mouse * 5.0);',
    '  color += warmLight * c1 * c2 * smoothstep(0.3, 0.05, dist) * mA * 0.1;',
    '',
    '  // ── Vignette ──',
    '  vec2 vc = uv - 0.5;',
    '  color *= 1.0 - dot(vc, vc) * 0.3;',
    '',
    '  // ── Anti-banding grain ──',
    '  color += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.006;',
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
    uniforms.mouse = gl.getUniformLocation(program, 'u_mouse');
    uniforms.mouseActive = gl.getUniformLocation(program, 'u_mouseActive');

    // Fullscreen quad
    var vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // ── Mouse & touch tracking ──
    function updateMouse(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      mouseTarget.x = (clientX - rect.left) / rect.width;
      mouseTarget.y = 1.0 - (clientY - rect.top) / rect.height;
      mouseActiveTarget = 1.0;
    }

    document.addEventListener('mousemove', function(e) {
      updateMouse(e.clientX, e.clientY);
    });

    document.addEventListener('mouseleave', function() {
      mouseActiveTarget = 0.0;
    });

    document.addEventListener('touchstart', function(e) {
      if (e.touches.length > 0) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 0) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    document.addEventListener('touchend', function() {
      mouseActiveTarget = 0.0;
    });

    // ── Resize handler ──
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

    // ── Animation loop ──
    var startTime = performance.now();

    function frame() {
      resize();
      var t = (performance.now() - startTime) / 1000.0;

      // Smooth mouse position — lerp for liquid feel
      mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.05;
      mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.05;

      // Smooth mouse active — fade in ~0.5s, fade out ~1s
      var fadeRate = mouseActiveTarget > mouseActiveCurrent ? 0.09 : 0.045;
      mouseActiveCurrent += (mouseActiveTarget - mouseActiveCurrent) * fadeRate;

      gl.uniform1f(uniforms.time, t);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.mouse, mouseCurrent.x, mouseCurrent.y);
      gl.uniform1f(uniforms.mouseActive, mouseActiveCurrent);
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
