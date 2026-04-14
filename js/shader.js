// Cherry Street Labs — Dual Shader: Mesh Gradient (B) + Liquid Glass (C)
(function() {
  'use strict';

  var activeMode = 'mesh'; // 'mesh' (Option B default) or 'glass' (Option C toggle)
  var gl, canvas, toggleBtn;
  var meshProgram, glassProgram;
  var meshUniforms = {};
  var glassUniforms = {};

  // ── Shared vertex shader ──
  var vertSrc = [
    'attribute vec2 a_position;',
    'void main() {',
    '  gl_Position = vec4(a_position, 0.0, 1.0);',
    '}'
  ].join('\n');

  // ── Option B: Apple Vision Pro mesh gradient (domain-warped FBM) ──
  var meshFragSrc = [
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
    '',
    '  // Domain warping — organic flowing color patches',
    '  vec2 q = vec2(',
    '    fbm(uv * 2.5 + vec2(0.0, 0.0) + t * 0.035),',
    '    fbm(uv * 2.5 + vec2(5.2, 1.3) + t * 0.025)',
    '  );',
    '',
    '  // Second warp layer (warp the warp)',
    '  vec2 r = vec2(',
    '    fbm(uv * 2.5 + 4.0 * q + vec2(1.7, 9.2) + t * 0.018),',
    '    fbm(uv * 2.5 + 4.0 * q + vec2(8.3, 2.8) + t * 0.022)',
    '  );',
    '',
    '  float f = fbm(uv * 2.5 + 4.0 * r);',
    '',
    '  // Palette',
    '  vec3 cream      = vec3(0.961, 0.949, 0.929);',
    '  vec3 cherry     = vec3(0.769, 0.118, 0.227);',
    '  vec3 sand       = vec3(0.863, 0.765, 0.647);',
    '  vec3 blush      = vec3(0.941, 0.769, 0.816);',
    '  vec3 deepCherry = vec3(0.600, 0.120, 0.220);',
    '',
    '  // Cream base',
    '  vec3 color = cream;',
    '',
    '  // Cherry bloom — large flowing patch',
    '  float cherryMask = smoothstep(0.30, 0.65, q.x + 0.08 * sin(t * 0.12));',
    '  color = mix(color, cherry, cherryMask * 0.25);',
    '',
    '  // Warm sand drift',
    '  float sandMask = smoothstep(0.32, 0.68, q.y + 0.06 * cos(t * 0.10));',
    '  color = mix(color, sand, sandMask * 0.35);',
    '',
    '  // Soft pink wash',
    '  float blushMask = smoothstep(0.38, 0.72, r.x + r.y * 0.3);',
    '  color = mix(color, blush, blushMask * 0.28);',
    '',
    '  // Deep cherry accent at convergence points',
    '  float accentMask = smoothstep(0.55, 0.78, f);',
    '  color = mix(color, deepCherry, accentMask * 0.12);',
    '',
    '  // Subtle grain',
    '  float grain = (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.008;',
    '  color += grain;',
    '',
    '  gl_FragColor = vec4(color, 1.0);',
    '}'
  ].join('\n');

  // ── Option C: Liquid glass with mouse tracking ──
  var glassFragSrc = [
    'precision highp float;',
    '',
    'uniform float u_time;',
    'uniform vec2 u_resolution;',
    'uniform vec2 u_mouse;',
    'uniform float u_mousePresence;',
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
    '',
    '  // Aspect-corrected coords for circular mouse influence',
    '  float aspect = u_resolution.x / u_resolution.y;',
    '  vec2 uvA = vec2(uv.x * aspect, uv.y);',
    '  vec2 mouseA = vec2(u_mouse.x * aspect, u_mouse.y);',
    '',
    '  // Mouse distance (aspect-corrected)',
    '  float mDist = length(uvA - mouseA);',
    '',
    '  // Liquid glass warp — push UVs away from mouse',
    '  float warpRadius = 0.35;',
    '  float warpAmt = u_mousePresence * smoothstep(warpRadius, 0.0, mDist) * 0.06;',
    '  vec2 warpDir = (uvA - mouseA) / (mDist + 0.001);',
    '  vec2 wUV = uv + warpDir * warpAmt;',
    '',
    '  // Palette',
    '  vec3 cream      = vec3(0.961, 0.949, 0.929);',
    '  vec3 cherry     = vec3(0.769, 0.118, 0.227);',
    '  vec3 sand       = vec3(0.863, 0.765, 0.647);',
    '  vec3 blush      = vec3(0.941, 0.769, 0.816);',
    '  vec3 deepCherry = vec3(0.784, 0.196, 0.314);',
    '',
    '  // Flowing noise layers (warped UVs create the glass distortion)',
    '  float n1 = fbm(wUV * 3.0 + vec2(t * 0.12, t * 0.10));',
    '  float n2 = fbm(wUV * 2.5 + vec2(-t * 0.08, t * 0.07) + 5.0);',
    '  float n3 = fbm(wUV * 4.0 + vec2(t * 0.06, -t * 0.09) + 10.0);',
    '  float n4 = fbm(wUV * 2.0 + vec2(t * 0.05, t * 0.04) + 15.0);',
    '',
    '  // Cream base',
    '  vec3 color = cream;',
    '',
    '  // Cherry region',
    '  float cherryMask = smoothstep(0.38, 0.62, n1 + 0.12 * sin(t * 0.3) + (1.0 - uv.y) * 0.15 + uv.x * 0.1);',
    '  color = mix(color, cherry, cherryMask * 0.32);',
    '',
    '  // Sand region',
    '  float sandMask = smoothstep(0.42, 0.68, n2 + 0.08 * cos(t * 0.25) + uv.y * 0.1 + (1.0 - uv.x) * 0.12);',
    '  color = mix(color, sand, sandMask * 0.38);',
    '',
    '  // Blush region',
    '  float blushMask = smoothstep(0.48, 0.68, n3);',
    '  color = mix(color, blush, blushMask * 0.30);',
    '',
    '  // Deep cherry accent',
    '  float accentMask = smoothstep(0.52, 0.72, n4 + uv.x * 0.15);',
    '  color = mix(color, deepCherry, accentMask * 0.18);',
    '',
    '  // Mouse cherry glow',
    '  float glowOuter = u_mousePresence * smoothstep(0.30, 0.02, mDist) * 0.30;',
    '  color = mix(color, cherry, glowOuter);',
    '',
    '  // Bright inner core',
    '  float glowInner = u_mousePresence * smoothstep(0.10, 0.0, mDist) * 0.20;',
    '  color = mix(color, vec3(1.0, 0.88, 0.88), glowInner);',
    '',
    '  // Subtle grain',
    '  float grain = (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.012;',
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

  function buildProgram(vert, fragSrc) {
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

  // ── Mode switching ──
  function setMode(mode) {
    activeMode = mode;
    if (toggleBtn) {
      toggleBtn.classList.toggle('active', mode === 'glass');
    }
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

    // Compile shared vertex shader
    var vert = compileShader(gl.VERTEX_SHADER, vertSrc);
    if (!vert) return;

    // Build both programs
    meshProgram = buildProgram(vert, meshFragSrc);
    glassProgram = buildProgram(vert, glassFragSrc);
    if (!meshProgram || !glassProgram) return;

    // Uniform locations — mesh (Option B)
    meshUniforms.time = gl.getUniformLocation(meshProgram, 'u_time');
    meshUniforms.resolution = gl.getUniformLocation(meshProgram, 'u_resolution');

    // Uniform locations — glass (Option C)
    glassUniforms.time = gl.getUniformLocation(glassProgram, 'u_time');
    glassUniforms.resolution = gl.getUniformLocation(glassProgram, 'u_resolution');
    glassUniforms.mouse = gl.getUniformLocation(glassProgram, 'u_mouse');
    glassUniforms.mousePresence = gl.getUniformLocation(glassProgram, 'u_mousePresence');

    // ── Fullscreen quad ──
    var vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

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

    // ── Mouse tracking (used by Option C) ──
    var mouseX = 0.5, mouseY = 0.5;
    var smoothX = 0.5, smoothY = 0.5;
    var mousePresence = 0.0;
    var smoothPresence = 0.0;
    var LERP = 0.06;
    var PRESENCE_FADE_IN = 0.04;
    var PRESENCE_FADE_OUT = 0.02;

    function updateMouse(clientX, clientY) {
      var rect = canvas.getBoundingClientRect();
      mouseX = (clientX - rect.left) / rect.width;
      mouseY = 1.0 - (clientY - rect.top) / rect.height;
      mousePresence = 1.0;
    }

    document.addEventListener('mousemove', function(e) {
      updateMouse(e.clientX, e.clientY);
    });
    document.addEventListener('mouseleave', function() {
      mousePresence = 0.0;
    });
    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 0) {
        updateMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    document.addEventListener('touchend', function() {
      mousePresence = 0.0;
    });

    // ── Toggle button setup ──
    toggleBtn = document.getElementById('shaderToggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function() {
        setMode(activeMode === 'mesh' ? 'glass' : 'mesh');
      });
    }

    // ── Animation loop ──
    var startTime = performance.now();

    function frame() {
      resize();
      var t = (performance.now() - startTime) / 1000.0;

      // Smooth mouse interpolation
      smoothX += (mouseX - smoothX) * LERP;
      smoothY += (mouseY - smoothY) * LERP;
      var pLerp = mousePresence > smoothPresence ? PRESENCE_FADE_IN : PRESENCE_FADE_OUT;
      smoothPresence += (mousePresence - smoothPresence) * pLerp;

      if (activeMode === 'glass') {
        gl.useProgram(glassProgram);
        gl.uniform1f(glassUniforms.time, t);
        gl.uniform2f(glassUniforms.resolution, canvas.width, canvas.height);
        gl.uniform2f(glassUniforms.mouse, smoothX, smoothY);
        gl.uniform1f(glassUniforms.mousePresence, smoothPresence);
      } else {
        gl.useProgram(meshProgram);
        gl.uniform1f(meshUniforms.time, t);
        gl.uniform2f(meshUniforms.resolution, canvas.width, canvas.height);
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // ── Expose toggle API ──
  window.toggleShaderMode = function() {
    var newMode = activeMode === 'mesh' ? 'glass' : 'mesh';
    setMode(newMode);
    return newMode;
  };
  window.getShaderMode = function() { return activeMode; };

  // ── Initialize ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 100);
    });
  } else {
    setTimeout(init, 100);
  }
})();
