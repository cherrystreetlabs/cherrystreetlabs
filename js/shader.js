// Cherry Street Labs — Simple Animated Gradient Background
(function() {
  'use strict';
  const canvas = document.getElementById('heroShader');
  if (!canvas) return;

  function resize() {
    canvas.width = canvas.clientWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.clientHeight * (window.devicePixelRatio || 1);
  }

  resize();
  window.addEventListener('resize', resize);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let t = 0;

  function frame() {
    t += 0.003;
    const w = canvas.width;
    const h = canvas.height;

    // Cream base
    ctx.fillStyle = '#F5F2ED';
    ctx.fillRect(0, 0, w, h);

    // Cherry red blob — upper right
    const x1 = w * (0.65 + 0.12 * Math.sin(t * 0.7));
    const y1 = h * (0.35 + 0.10 * Math.cos(t * 0.5));
    const g1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, Math.max(w, h) * 0.45);
    g1.addColorStop(0, 'rgba(196, 30, 58, 0.38)');
    g1.addColorStop(0.5, 'rgba(196, 30, 58, 0.12)');
    g1.addColorStop(1, 'rgba(196, 30, 58, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    // Warm sand blob — lower left
    const x2 = w * (0.25 + 0.10 * Math.cos(t * 0.6));
    const y2 = h * (0.70 + 0.08 * Math.sin(t * 0.4));
    const g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, Math.max(w, h) * 0.40);
    g2.addColorStop(0, 'rgba(220, 195, 165, 0.45)');
    g2.addColorStop(0.6, 'rgba(220, 195, 165, 0.15)');
    g2.addColorStop(1, 'rgba(220, 195, 165, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    // Soft pink blob — center-right
    const x3 = w * (0.55 + 0.08 * Math.sin(t * 0.8 + 1.0));
    const y3 = h * (0.55 + 0.12 * Math.cos(t * 0.5 + 0.5));
    const g3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, Math.max(w, h) * 0.35);
    g3.addColorStop(0, 'rgba(240, 196, 208, 0.40)');
    g3.addColorStop(0.5, 'rgba(240, 196, 208, 0.10)');
    g3.addColorStop(1, 'rgba(240, 196, 208, 0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, w, h);

    // Cherry-pink blend — accent
    const x4 = w * (0.75 + 0.06 * Math.cos(t * 0.9));
    const y4 = h * (0.20 + 0.08 * Math.sin(t * 0.6));
    const g4 = ctx.createRadialGradient(x4, y4, 0, x4, y4, Math.max(w, h) * 0.25);
    g4.addColorStop(0, 'rgba(200, 50, 80, 0.25)');
    g4.addColorStop(0.5, 'rgba(200, 50, 80, 0.08)');
    g4.addColorStop(1, 'rgba(200, 50, 80, 0)');
    ctx.fillStyle = g4;
    ctx.fillRect(0, 0, w, h);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
