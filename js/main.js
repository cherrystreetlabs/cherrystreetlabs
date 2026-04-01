/* Cherry Street Labs */

'use strict';

/* ── Viewport ────────────────────────────────────────────────────── */
function setVh() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
setVh();
window.addEventListener('resize', () => requestAnimationFrame(setVh));
window.addEventListener('orientationchange', () => setTimeout(setVh, 300));

/* ── Film Grain — subtle analog texture ─────────────────────────── */
(function grainEffect() {
    const canvas = document.getElementById('grain');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, raf;

    function resize() {
        w = canvas.width  = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
        const img = ctx.createImageData(w, h);
        const d = img.data;
        for (let i = 0, n = d.length; i < n; i += 4) {
            const v = Math.random() * 255;
            d[i] = d[i+1] = d[i+2] = v;
            d[i+3] = 14; // very faint
        }
        ctx.putImageData(img, 0, 0);
        raf = requestAnimationFrame(draw);
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        draw();
    }
})();

/* ── Overlay ─────────────────────────────────────────────────────── */
const whoWeAreBtn = document.getElementById('whoWeAreBtn');
const overlay     = document.getElementById('whoWeAreOverlay');
const closeBtn    = document.getElementById('closeOverlay');

function openOverlay(e) {
    if (e) e.preventDefault();
    overlay.style.visibility = 'visible';
    document.body.style.overflow = 'hidden';
    overlay.offsetHeight;
    overlay.classList.add('active');
    closeBtn.focus();
}

function closeOverlay() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
        if (!overlay.classList.contains('active'))
            overlay.style.visibility = 'hidden';
    }, 500);
}

whoWeAreBtn.addEventListener('click', openOverlay);
closeBtn.addEventListener('click', closeOverlay);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeOverlay();
});
