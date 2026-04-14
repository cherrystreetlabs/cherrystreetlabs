// Cherry Street Labs — WebGL Liquid Glass Shader with Mouse Tracking
(function() {
  'use strict';

  function init() {
    var canvas = document.getElementById('heroShader');
    if (!canvas) return;

    var gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) {
      canvas.style.background = '#F5F2ED';
      return;
    }

    // ── Vertex shader ──
    var vertSrc = [
      'attribute vec2 a_position;',
      'void main() {',
      '  gl_Position = vec4(a_position, 0.0, 1.0);',
      '}'
    ].join('\n');

    // ── Fragment shader ──
    var fragSrc = [
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
      '  // Liquid glass warp — push UVs away from mouse like pressing into warm glass',
      '  float warpRadius = 0.35;',
      '  float warpAmt = u_mousePresence * smoothstep(warpRadius, 0.0, mDist) * 0.06;',
      '  vec2 warpDir = (uvA - mouseA) / (mDist + 0.001);',
      '  vec2 wUV = uv + warpDir * warpAmt;',
      '',
      '  // Palette',
      '  vec3 cream      = vec3(0.961, 0.949, 0.929);',
      '  vec3 cherry      = vec3(0.769, 0.118, 0.227);',
      '  vec3 sand        = vec3(0.863, 0.765, 0.647);',
      '  vec3 blush       = vec3(0.941, 0.769, 0.816);',
      '  vec3 deepCherry  = vec3(0.784, 0.196, 0.314);',
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
      '  // Cherry region — drifts upper-right',
      '  float cherryMask = smoothstep(0.38, 0.62, n1 + 0.12 * sin(t * 0.3) + (1.0 - uv.y) * 0.15 + uv.x * 0.1);',
      '  color = mix(color, cherry, cherryMask * 0.32);',
      '',
      '  // Sand region — drifts lower-left',
      '  float sandMask = smoothstep(0.42, 0.68, n2 + 0.08 * cos(t * 0.25) + uv.y * 0.1 + (1.0 - uv.x) * 0.12);',
      '  color = mix(color, sand, sandMask * 0.38);',
      '',
      '  // Blush region — wanders through center',
      '  float blushMask = smoothstep(0.48, 0.68, n3);',
      '  color = mix(color, blush, blushMask * 0.30);',
      '',
      '  // Deep cherry accent — subtle',
      '  float accentMask = smoothstep(0.52, 0.72, n4 + uv.x * 0.15);',
      '  color = mix(color, deepCherry, accentMask * 0.18);',
      '',
      '  // Mouse cherry glow — warm press into glass',
      '  float glowOuter = u_mousePresence * smoothstep(0.30, 0.02, mDist) * 0.30;',
      '  color = mix(color, cherry, glowOuter);',
      '',
      '  // Bright inner core — warm highlight at press point',
      '  float glowInner = u_mousePresence * smoothstep(0.10, 0.0, mDist) * 0.20;',
      '  color = mix(color, vec3(1.0, 0.88, 0.88), glowInner);',
      '',
      '  // Subtle film grain',
      '  float grain = (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.012;',
      '  color += grain;',
      '',
      '  gl_FragColor = vec4(color, 1.0);',
      '}'
    ].join('\n');

    // ── Compile shaders ──
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

    var vert = compileShader(gl.VERTEX_SHADER, vertSrc);
    var frag = compileShader(gl.FRAGMENT_SHADER, fragSrc);
    if (!vert || !frag) return;

    var program = gl.createProgram();
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    // ── Fullscreen quad ──
    var vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // ── Uniform locations ──
    var uTime = gl.getUniformLocation(program, 'u_time');
    var uResolution = gl.getUniformLocation(program, 'u_resolution');
    var uMouse = gl.getUniformLocation(program, 'u_mouse');
    var uMousePresence = gl.getUniformLocation(program, 'u_mousePresence');

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

    // ── Mouse tracking ──
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

    // ── Animation loop ──
    var startTime = performance.now();

    function frame() {
      resize();

      var t = (performance.now() - startTime) / 1000.0;

      // Smooth interpolation
      smoothX += (mouseX - smoothX) * LERP;
      smoothY += (mouseY - smoothY) * LERP;
      var pLerp = mousePresence > smoothPresence ? PRESENCE_FADE_IN : PRESENCE_FADE_OUT;
      smoothPresence += (mousePresence - smoothPresence) * pLerp;

      gl.uniform1f(uTime, t);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform2f(uMouse, smoothX, smoothY);
      gl.uniform1f(uMousePresence, smoothPresence);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // Initialize after DOM ready with small delay
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(init, 100);
    });
  } else {
    setTimeout(init, 100);
  }
})();
