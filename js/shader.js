// Cherry Street Labs — Pure WebGL Swirl shader (no external deps)
// Recreates the Shaders.com Swirl + WaveDistortion + FilmGrain + CursorRipples preset
(function () {
  var canvas = document.getElementById('heroShader');
  if (!canvas) return;

  var gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) {
    canvas.style.background = '#F5F2ED';
    canvas.style.opacity = '1';
    return;
  }

  // --- Vertex shader ---
  var VERT = [
    'attribute vec2 a_pos;',
    'void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }'
  ].join('\n');

  // --- Fragment shader ---
  var FRAG = [
    'precision highp float;',
    'uniform float u_time;',
    'uniform vec2  u_res;',
    'uniform vec2  u_mouse;',
    'uniform float u_mouseStr;',
    '',
    '// ripple ring buffer (up to 12 ripples)',
    'uniform vec3 u_ripples[12];', // xy = position, z = birth time
    'uniform int  u_rippleCount;',
    '',
    '// --- Noise helpers ---',
    'vec3 mod289(vec3 x) { return x - floor(x / 289.0) * 289.0; }',
    'vec2 mod289v2(vec2 x) { return x - floor(x / 289.0) * 289.0; }',
    'vec3 permute(vec3 x) { return mod289((x * 34.0 + 1.0) * x); }',
    '',
    '// Simplex 2D noise',
    'float snoise(vec2 v) {',
    '  const vec4 C = vec4(0.211324865405187, 0.366025403784439,',
    '                      -0.577350269189626, 0.024390243902439);',
    '  vec2 i = floor(v + dot(v, C.yy));',
    '  vec2 x0 = v - i + dot(i, C.xx);',
    '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
    '  vec4 x12 = x0.xyxy + C.xxzz;',
    '  x12.xy -= i1;',
    '  i = mod289v2(i);',
    '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
    '  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);',
    '  m = m * m; m = m * m;',
    '  vec3 x_ = 2.0 * fract(p * C.www) - 1.0;',
    '  vec3 h = abs(x_) - 0.5;',
    '  vec3 ox = floor(x_ + 0.5);',
    '  vec3 a0 = x_ - ox;',
    '  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);',
    '  vec3 g;',
    '  g.x = a0.x * x0.x + h.x * x0.y;',
    '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
    '  return 130.0 * dot(m, g);',
    '}',
    '',
    '// FBM with swirl distortion',
    'float fbmSwirl(vec2 p, float t) {',
    '  float val = 0.0;',
    '  float amp = 0.5;',
    '  float freq = 1.0;',
    '  for (int i = 0; i < 5; i++) {',
    '    // rotate each octave for swirl feel',
    '    float angle = t * 0.15 + float(i) * 0.8;',
    '    float cs = cos(angle); float sn = sin(angle);',
    '    vec2 rp = vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs);',
    '    val += amp * snoise(rp * freq);',
    '    freq *= 2.0;',
    '    amp *= 0.5;',
    '    p += vec2(snoise(rp * 0.5 + t * 0.1), snoise(rp * 0.5 + 100.0 + t * 0.1)) * 0.3;',
    '  }',
    '  return val;',
    '}',
    '',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  float aspect = u_res.x / u_res.y;',
    '  vec2 p = uv;',
    '  p.x *= aspect;',
    '',
    '  float t = u_time * 0.8;', // speed = 0.8
    '',
    '  // --- Wave distortion (angle 203 deg, freq 2.8) ---',
    '  float waveAngle = radians(203.0);',
    '  vec2 waveDir = vec2(cos(waveAngle), sin(waveAngle));',
    '  float waveFactor = dot(p, waveDir) * 2.8;',
    '  float wave = sin(waveFactor + t * 2.5) * 0.5;', // strength 0.5, speed 2.5
    '  vec2 waveOff = vec2(cos(waveAngle + 1.5708), sin(waveAngle + 1.5708)) * wave * 0.04;',
    '  p += waveOff;',
    '',
    '  // --- Mouse influence ---',
    '  vec2 mp = u_mouse;',
    '  mp.x *= aspect;',
    '  float mouseDist = length(p - mp);',
    '  float mouseInfl = u_mouseStr * smoothstep(0.5, 0.0, mouseDist) * 0.15;',
    '  vec2 mouseWarp = normalize(p - mp + 0.001) * mouseInfl;',
    '  p += mouseWarp;',
    '',
    '  // --- Cursor ripples ---',
    '  for (int i = 0; i < 12; i++) {',
    '    if (i >= u_rippleCount) break;',
    '    vec2 rPos = u_ripples[i].xy;',
    '    rPos.x *= aspect;',
    '    float age = u_time - u_ripples[i].z;',
    '    if (age < 0.0 || age > 3.0) continue;',
    '    float rippleRadius = age * 0.4;',   // expansion speed
    '    float d = length(p - rPos);',
    '    float ringWidth = 0.08;',
    '    float ring = exp(-pow((d - rippleRadius) / ringWidth, 2.0));',
    '    float decay = exp(-age * 1.667);',  // decay ~5
    '    float intensity = ring * decay * 0.06;', // intensity 3 scaled
    '    vec2 dir = normalize(p - rPos + 0.0001);',
    '    p += dir * intensity;',
    '  }',
    '',
    '  // --- FBM swirl layers (detail 1.7 maps to scale) ---',
    '  float n1 = fbmSwirl(p * 1.7, t);',
    '  float n2 = fbmSwirl(p * 1.7 + vec2(5.2, 1.3), t * 0.7);',
    '  float n3 = fbmSwirl(p * 1.7 + vec2(-3.1, 4.7), t * 0.5);',
    '',
    '  // Combine into a flowing domain-warp pattern',
    '  vec2 q = vec2(n1, n2);',
    '  float warpedNoise = fbmSwirl(p * 1.7 + q * 1.5, t * 0.6);',
    '',
    '  // Blend factor: map noise to 0..1 with ~15% cherry visible',
    '  float blend = smoothstep(-0.3, 1.2, warpedNoise);',
    '  blend = blend * 0.28;', // keep cherry subtle ~15% at peaks
    '',
    '  // --- Colors (linear space) ---',
    '  vec3 cream  = vec3(0.922, 0.898, 0.871);',  // #F5F2ED -> linear approx
    '  vec3 cherry = vec3(0.694, 0.502, 0.502);',  // #D4A0A0 -> linear approx
    '',
    '  // oklch-ish blend: mix in a perceptually even way',
    '  vec3 col = mix(cream, cherry, blend);',
    '',
    '  // Add subtle luminance variation from noise for silk-like depth',
    '  col += n3 * 0.025;',
    '',
    '  // --- Film grain (strength 0.15) ---',
    '  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + u_time * 43.0) * 43758.5453);',
    '  grain = (grain - 0.5) * 0.15;',
    '  col += grain;',
    '',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  // --- Compile shaders ---
  function compile(src, type) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Shader compile:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  var vs = compile(VERT, gl.VERTEX_SHADER);
  var fs = compile(FRAG, gl.FRAGMENT_SHADER);
  if (!vs || !fs) {
    canvas.style.background = '#F5F2ED';
    canvas.style.opacity = '1';
    return;
  }

  var prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link:', gl.getProgramInfoLog(prog));
    canvas.style.background = '#F5F2ED';
    canvas.style.opacity = '1';
    return;
  }
  gl.useProgram(prog);

  // --- Full-screen quad ---
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // --- Uniforms ---
  var uTime = gl.getUniformLocation(prog, 'u_time');
  var uRes = gl.getUniformLocation(prog, 'u_res');
  var uMouse = gl.getUniformLocation(prog, 'u_mouse');
  var uMouseStr = gl.getUniformLocation(prog, 'u_mouseStr');
  var uRippleCount = gl.getUniformLocation(prog, 'u_rippleCount');
  var uRipples = [];
  for (var i = 0; i < 12; i++) {
    uRipples.push(gl.getUniformLocation(prog, 'u_ripples[' + i + ']'));
  }

  // --- State ---
  var mouseX = 0.5, mouseY = 0.5;
  var targetX = 0.5, targetY = 0.5;
  var mouseStrength = 0;
  var targetStrength = 0;
  var startTime = performance.now() / 1000;

  // Ripple buffer
  var ripples = []; // {x, y, t}
  var lastRippleTime = 0;

  function onPointer(e) {
    var rect = canvas.getBoundingClientRect();
    var cx, cy;
    if (e.touches) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else {
      cx = e.clientX;
      cy = e.clientY;
    }
    targetX = (cx - rect.left) / rect.width;
    targetY = 1.0 - (cy - rect.top) / rect.height;
    targetStrength = 1.0;

    // Add ripple (throttle to every 80ms)
    var now = performance.now() / 1000 - startTime;
    if (now - lastRippleTime > 0.08) {
      ripples.push({ x: targetX, y: targetY, t: now });
      if (ripples.length > 12) ripples.shift();
      lastRippleTime = now;
    }
  }

  function onPointerLeave() {
    targetStrength = 0;
  }

  canvas.addEventListener('mousemove', onPointer);
  canvas.addEventListener('touchmove', onPointer, { passive: true });
  canvas.addEventListener('touchstart', onPointer, { passive: true });
  canvas.addEventListener('mouseleave', onPointerLeave);
  canvas.addEventListener('touchend', onPointerLeave);

  // --- Resize ---
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (canvas.width !== (w * dpr | 0) || canvas.height !== (h * dpr | 0)) {
      canvas.width = w * dpr | 0;
      canvas.height = h * dpr | 0;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
  }
  window.addEventListener('resize', resize);
  resize();

  // --- Render loop ---
  function frame() {
    resize();

    var now = performance.now() / 1000 - startTime;

    // Lerp mouse
    mouseX += (targetX - mouseX) * 0.08;
    mouseY += (targetY - mouseY) * 0.08;
    mouseStrength += (targetStrength - mouseStrength) * 0.05;

    gl.uniform1f(uTime, now);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.uniform1f(uMouseStr, mouseStrength);

    // Upload ripples (prune expired ones > 3s old)
    var alive = [];
    for (var i = 0; i < ripples.length; i++) {
      if (now - ripples[i].t < 3.0) alive.push(ripples[i]);
    }
    ripples = alive;

    gl.uniform1i(uRippleCount, ripples.length);
    for (var j = 0; j < 12; j++) {
      if (j < ripples.length) {
        gl.uniform3f(uRipples[j], ripples[j].x, ripples[j].y, ripples[j].t);
      }
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  }

  // Kick off
  frame();
  canvas.style.animation = 'shaderFadeIn 2.5s ease-out forwards';
  console.log('Shader loaded successfully (pure WebGL)');
})();
