/* Cherry Street Labs — main.js */

'use strict';

/* ── Viewport Height Fix (iOS Safari) ─────────────────────────── */
function setVh() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
setVh();
window.addEventListener('resize', () => requestAnimationFrame(setVh));
window.addEventListener('orientationchange', () => setTimeout(setVh, 300));

/* ── Reduced Motion ─────────────────────────────────────────────── */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── NYC Traffic Three.js Scene ────────────────────────────────── */
let trafficScene = null;

async function initTrafficScene() {
    if (prefersReducedMotion) return;

    const canvas = document.getElementById('traffic-canvas');
    if (!canvas) return;

    try {
        const { NYCTrafficScene } = await import('./nyc-traffic.js');
        trafficScene = new NYCTrafficScene(canvas);
        trafficScene.init();
    } catch (err) {
        console.error('[Cherry Street Labs] Traffic scene failed to load:', err);
    }
}

/* ── Mouse Parallax Tilt ───────────────────────────────────────── */
class ParallaxTilt {
    constructor(el) {
        this.el = el;
        this.raf = null;
        this.current = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        this._strength = 8;

        document.addEventListener('mousemove', (e) => {
            this.target.x = (e.clientX / window.innerWidth - 0.5);
            this.target.y = (e.clientY / window.innerHeight - 0.5);
            if (!this.raf) this._loop();
        });
        document.addEventListener('mouseleave', () => {
            this.target.x = 0;
            this.target.y = 0;
        });
    }

    _loop() {
        this.current.x += (this.target.x - this.current.x) * 0.06;
        this.current.y += (this.target.y - this.current.y) * 0.06;

        const rx = -(this.current.y * this._strength);
        const ry = (this.current.x * this._strength);
        const tz = Math.abs(this.current.x) * 4 + Math.abs(this.current.y) * 4;

        this.el.style.transform =
            `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${tz}px)`;

        if (Math.abs(this.target.x) > 0.001 || Math.abs(this.target.y) > 0.001 ||
            Math.abs(this.current.x) > 0.001 || Math.abs(this.current.y) > 0.001) {
            this.raf = requestAnimationFrame(() => this._loop());
        } else {
            this.raf = null;
        }
    }
}

/* ── Who We Are Overlay ───────────────────────────────────────── */
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
    if (trafficScene) trafficScene.stop();
}

function closeOverlay() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
        if (!overlay.classList.contains('active')) {
            overlay.style.visibility = 'hidden';
        }
    }, 500);
    if (trafficScene) trafficScene.start();
}

whoWeAreBtn.addEventListener('click', openOverlay);
closeBtn.addEventListener('click', closeOverlay);
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) closeOverlay();
});

/* ── Init ─────────────────────────────────────────────────────── */
requestAnimationFrame(() => {
    // Start Three.js traffic scene
    initTrafficScene();

    // Parallax tilt on brand panel (desktop only)
    const panel = document.getElementById('brand-panel');
    if (panel && !prefersReducedMotion) {
        new ParallaxTilt(panel);
    }
});
